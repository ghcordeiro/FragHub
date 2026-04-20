import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { loadEnv } from '../config/env';
import { matchesWebhookLimiter } from '../middleware/rateLimits';
import { db } from '../db';
import { notifyMatchComplete } from '../services/discordNotifyService';
import { updateElo } from '../services/eloUpdateStub';
import { parseMatchWebhook } from '../services/matchWebhookPayloads';
import { persistWebhookMatch } from '../services/matchWebhookService';
import { verifyAccessToken } from '../services/tokenService';
import { isDuplicateKeyError } from '../utils/dbErrors';
import * as eloService from '../services/eloService';
import { setLiveState, clearLiveState } from '../services/liveStateService';
import logger from '../logger';

const router = Router();

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function webhookSecretMiddleware(req: Request, res: Response, next: NextFunction): void {
  const env = loadEnv();
  const got = req.get('x-fraghub-secret');
  if (!got || !timingSafeStringEqual(got, env.WEBHOOK_SECRET)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const listMatchesQuery = z.object({
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().transform((n) => Math.min(50, n)),
  game: z.enum(['cs2', 'csgo']).optional(),
  map: z.string().max(64).optional(),
});

const listPlayerMatchesQuery = z.object({
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().transform((n) => Math.min(50, n)),
  game: z.enum(['cs2', 'csgo']).optional(),
});

function singleQueryParam(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    return v[0];
  }
  if (v === undefined || v === null) {
    return undefined;
  }
  return String(v);
}

type AdminGate = 'ok' | 'no_auth' | 'not_admin';

async function adminFromBearer(req: Request): Promise<AdminGate> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return 'no_auth';
  }
  const token = header.slice(7).trim();
  try {
    const env = loadEnv();
    const payload = verifyAccessToken(token, env.JWT_SECRET);
    const row = await db('users').where({ id: payload.sub }).first();
    if (!row || row.banned_at != null) {
      return 'no_auth';
    }
    if (row.role !== 'admin') {
      return 'not_admin';
    }
    return 'ok';
  } catch {
    return 'no_auth';
  }
}

router.post(
  '/matches/webhook',
  matchesWebhookLimiter,
  webhookSecretMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info('[WEBHOOK] Received CS2 match event', {
      event: req.body?.event,
      matchid: req.body?.matchid,
      ip: req.ip,
    });

    // Captura estado ao vivo a cada rodada
    if (req.body?.event === 'round_end') {
      try {
        const b = req.body as Record<string, unknown>;
        const parseTeam = (t: Record<string, unknown>) => ({
          name: String(t.name ?? ''),
          score: Number(t.score ?? 0),
          players: ((t.players as Array<Record<string, unknown>>) ?? []).map((p) => {
            const s = (p.stats ?? {}) as Record<string, unknown>;
            return {
              steamId: String(p.steamid ?? ''),
              name: typeof p.name === 'string' ? p.name : null,
              kills: Number(s.kills ?? 0),
              deaths: Number(s.deaths ?? 0),
              assists: Number(s.assists ?? 0),
              headshots: Number(s.headshot_kills ?? 0),
              score: Number(s.score ?? 0),
              mvp: Number(s.mvp ?? 0),
            };
          }),
        });
        setLiveState({
          matchId: Number(b.matchid),
          mapNumber: Number(b.map_number ?? 0),
          mapName: typeof b.map_name === 'string' ? b.map_name : undefined,
          round: Number(b.round_number ?? 0),
          team1: parseTeam(b.team1 as Record<string, unknown>),
          team2: parseTeam(b.team2 as Record<string, unknown>),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // non-blocking
      }
      res.status(200).json({ ok: true });
      return;
    }

    let normalized;
    try {
      normalized = parseMatchWebhook(req.body);
      logger.info('[WEBHOOK] Parsed match payload', {
        game: normalized.game,
        source: normalized.source,
        externalMatchId: normalized.externalMatchId,
        map: normalized.map,
        winner: normalized.winner,
        score: `${normalized.team1Score}-${normalized.team2Score}`,
        players: normalized.players.length,
      });
    } catch (e) {
      logger.warn('[WEBHOOK] Failed to parse payload', { error: e instanceof Error ? e.message : String(e), body: req.body });
      res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid payload' });
      return;
    }
    try {
      const matchId = await db.transaction(async (trx) => persistWebhookMatch(trx, req.body, normalized));
      clearLiveState();
      logger.info('[WEBHOOK] Match persisted to DB', { matchId, statsInserted: normalized.players.length });
      try {
        updateElo(matchId);
      } catch (e) {
        logger.warn('[matches] updateElo stub failed', { error: e instanceof Error ? e.message : String(e) });
      }
      // Phase 5: Update ELO ratings from eloService
      let eloChanges: Awaited<ReturnType<typeof eloService.updatePlayerEloOnMatch>> = [];
      try {
        eloChanges = await eloService.updatePlayerEloOnMatch(String(matchId), req.body, db);
      } catch (e) {
        logger.warn('[matches] ELO update failed (non-blocking):', e);
      }
      const sortedByKills = [...normalized.players].sort((a, b) => b.kills - a.kills);
      const mvpPlayer = sortedByKills[0];
      const winnerTeam = normalized.winner === 'team1' ? 'TEAM_A' : 'TEAM_B';
      notifyMatchComplete({
        winner: winnerTeam as 'TEAM_A' | 'TEAM_B',
        score: { teamA: normalized.team1Score, teamB: normalized.team2Score },
        mvp: {
          id: mvpPlayer?.steamId64 ?? '',
          displayName: mvpPlayer?.displayName ?? mvpPlayer?.steamId64 ?? '—',
        },
        eloChanges: eloChanges.map(ec => ({
          user: { id: ec.userId, displayName: ec.displayName ?? ec.userId },
          change: ec.change,
        })),
      });
      res.status(200).json({ matchId });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        res.status(409).json({ error: 'Duplicate match' });
        return;
      }
      next(e);
    }
  },
);

router.get('/matches', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = listMatchesQuery.safeParse({
    page: singleQueryParam(req.query.page) ?? '1',
    limit: singleQueryParam(req.query.limit) ?? '20',
    game: singleQueryParam(req.query.game),
    map: singleQueryParam(req.query.map),
  });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }
  const { page, limit, game, map } = parsed.data;
  const offset = (page - 1) * limit;
  try {
    let countQ = db('matches as m').whereNotNull('m.webhook_source');
    let listQ = db('matches as m').whereNotNull('m.webhook_source');
    if (game) {
      countQ = countQ.andWhere('m.game', game);
      listQ = listQ.andWhere('m.game', game);
    }
    if (map) {
      countQ = countQ.andWhere('m.map', map);
      listQ = listQ.andWhere('m.map', map);
    }
    const countRow = await countQ.clone().clearSelect().select(db.raw('COUNT(*) AS c')).first();
    const total = Number((countRow as { c?: string | number } | undefined)?.c ?? 0);
    const rows = await listQ
      .clone()
      .select(
        'm.id',
        'm.game',
        'm.map',
        'm.team1_score as team1Score',
        'm.team2_score as team2Score',
        'm.winner',
        'm.duration_seconds as durationSeconds',
        'm.played_at as playedAt',
        db.raw('(SELECT COUNT(*) FROM stats s WHERE s.match_id = m.id) as playerCount'),
      )
      .orderBy('m.played_at', 'desc')
      .orderBy('m.id', 'desc')
      .offset(offset)
      .limit(limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.status(200).json({
      data: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        game: r.game,
        map: r.map,
        team1Score: r.team1Score,
        team2Score: r.team2Score,
        winner: r.winner,
        durationSeconds: r.durationSeconds,
        playedAt: r.playedAt,
        playerCount: Number(r.playerCount ?? 0),
      })),
      meta: { total, page, limit, totalPages },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/matches/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  const includeRaw = String(req.query.includeRaw) === 'true';
  if (includeRaw) {
    const gate = await adminFromBearer(req);
    if (gate === 'no_auth') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (gate === 'not_admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }
  try {
    const m = await db('matches').where({ id }).whereNotNull('webhook_source').first();
    if (!m) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    const statsRows = await db('stats as s')
      .leftJoin('users as u', 'u.id', 's.user_id')
      .where('s.match_id', id)
      .select(
        's.steam_id as steamId',
        'u.display_name as displayName',
        's.team',
        's.kills',
        's.deaths',
        's.assists',
        's.headshots',
        's.mvps',
        's.score',
      );
    const players = statsRows.map((r: Record<string, unknown>) => {
      const kills = Number(r.kills ?? 0);
      const deaths = Number(r.deaths ?? 0);
      const kdr = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;
      return {
        steamId: r.steamId,
        displayName: r.displayName ?? null,
        team: r.team,
        kills,
        deaths,
        assists: Number(r.assists ?? 0),
        headshots: Number(r.headshots ?? 0),
        mvps: Number(r.mvps ?? 0),
        score: Number(r.score ?? 0),
        kdr,
      };
    });
    const body: Record<string, unknown> = {
      id: m.id,
      game: m.game,
      map: m.map,
      team1Score: m.team1_score,
      team2Score: m.team2_score,
      winner: m.winner,
      durationSeconds: m.duration_seconds,
      playedAt: m.played_at,
      players,
    };
    if (includeRaw) {
      let raw = m.raw_payload;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw) as unknown;
        } catch {
          raw = m.raw_payload;
        }
      }
      body.rawPayload = raw;
    }
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
});

router.get('/players/:id/matches', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  const parsed = listPlayerMatchesQuery.safeParse({
    page: singleQueryParam(req.query.page) ?? '1',
    limit: singleQueryParam(req.query.limit) ?? '20',
    game: singleQueryParam(req.query.game),
  });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }
  const { page, limit, game } = parsed.data;
  const offset = (page - 1) * limit;
  try {
    const user = await db('users').select('id', 'steam_id', 'banned_at').where({ id }).first();
    if (!user || user.banned_at != null) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    let base = db('stats as s')
      .innerJoin('matches as m', 'm.id', 's.match_id')
      .where(function () {
        void this.where('s.user_id', id);
        if (user.steam_id) {
          void this.orWhere('s.steam_id', user.steam_id);
        }
      })
      .whereNotNull('m.webhook_source');
    if (game) {
      base = base.andWhere('m.game', game);
    }
    const countRow = await base.clone().clearSelect().select(db.raw('COUNT(DISTINCT m.id) AS c')).first();
    const total = Number((countRow as { c?: string | number } | undefined)?.c ?? 0);
    const rows = await base
      .clone()
      .select(
        'm.id as matchId',
        'm.game',
        'm.map',
        'm.team1_score as team1Score',
        'm.team2_score as team2Score',
        'm.winner',
        'm.played_at as playedAt',
        's.kills',
        's.deaths',
        's.assists',
        's.team',
      )
      .orderBy('m.played_at', 'desc')
      .orderBy('m.id', 'desc')
      .offset(offset)
      .limit(limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.status(200).json({
      data: rows.map((r: Record<string, unknown>) => ({
        matchId: r.matchId,
        game: r.game,
        map: r.map,
        team1Score: r.team1Score,
        team2Score: r.team2Score,
        winner: r.winner,
        playedAt: r.playedAt,
        yourStats: {
          team: r.team,
          kills: Number(r.kills ?? 0),
          deaths: Number(r.deaths ?? 0),
          assists: Number(r.assists ?? 0),
        },
      })),
      meta: { total, page, limit, totalPages },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/players/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  try {
    const user = await db('users').select('id', 'steam_id', 'banned_at').where({ id }).first();
    if (!user || user.banned_at != null) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    const rawAgg = await db.raw(
      `
      SELECT
        COUNT(DISTINCT s.match_id) AS matchesPlayed,
        COUNT(DISTINCT CASE WHEN m.winner = 'draw' THEN s.match_id END) AS draws,
        COUNT(DISTINCT CASE
          WHEN (m.winner = 'team1' AND s.team = 'team1') OR (m.winner = 'team2' AND s.team = 'team2')
          THEN s.match_id END) AS wins,
        COUNT(DISTINCT CASE
          WHEN (m.winner = 'team1' AND s.team = 'team2') OR (m.winner = 'team2' AND s.team = 'team1')
          THEN s.match_id END) AS losses,
        COALESCE(SUM(s.kills), 0) AS kills,
        COALESCE(SUM(s.deaths), 0) AS deaths,
        COALESCE(SUM(s.assists), 0) AS assists,
        COALESCE(SUM(s.headshots), 0) AS headshots,
        COALESCE(SUM(s.mvps), 0) AS mvps
      FROM stats s
      INNER JOIN matches m ON m.id = s.match_id
      WHERE m.webhook_source IS NOT NULL
        AND (s.user_id = ? OR (? IS NOT NULL AND s.steam_id = ?))
      `,
      [id, user.steam_id, user.steam_id],
    );
    const row = (rawAgg as [rows: Record<string, unknown>[], unknown])[0][0];
    const kills = Number(row?.kills ?? 0);
    const deaths = Number(row?.deaths ?? 0);
    const headshots = Number(row?.headshots ?? 0);
    const kdr = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;
    const hsPercent = kills > 0 ? Math.round((headshots / kills) * 10000) / 100 : 0;
    const matchesPlayed = Number(row?.matchesPlayed ?? 0);
    const avgKills = matchesPlayed > 0 ? Math.round((kills / matchesPlayed) * 100) / 100 : 0;
    res.status(200).json({
      matchesPlayed,
      wins: Number(row?.wins ?? 0),
      losses: Number(row?.losses ?? 0),
      draws: Number(row?.draws ?? 0),
      kills,
      deaths,
      assists: Number(row?.assists ?? 0),
      headshots,
      mvps: Number(row?.mvps ?? 0),
      kdr,
      hsPercent,
      avgKillsPerMatch: avgKills,
    });
  } catch (e) {
    next(e);
  }
});

export default router;

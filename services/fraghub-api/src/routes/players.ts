import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { playerPublicLimiter } from '../middleware/rateLimits';
import { db } from '../db';
import { revokeAllForUser } from '../services/refreshTokenService';
import {
  banUser,
  countPublicUsers,
  findPlayerPublicBySteamId,
  findPublicProfileById,
  findUserById,
  listPublicPlayersWithStats,
  type PublicListSort,
  updateUserDisplayName,
} from '../services/userService';
import { levelFromEloRating } from '../utils/elo';

const router = Router();

function kdrOf(kills: number, deaths: number): number {
  if (deaths <= 0) {
    return kills;
  }
  return Math.round((kills / deaths) * 100) / 100;
}

function singleQueryParam(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    return v[0];
  }
  if (v === undefined || v === null) {
    return undefined;
  }
  return String(v);
}

/** PLAYAPI-REQ-009 — query string → tipos seguros (zod) */
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().transform((n) => Math.min(100, n)),
  sort: z.enum(['elo_desc', 'elo_asc', 'name_asc']),
});

const patchMeSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, 'displayName must be at least 3 characters')
    .max(32, 'displayName must be at most 32 characters')
    .regex(/^[\p{L}\p{N} _.-]+$/u, 'displayName contains invalid characters'),
});

const banBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

router.get('/players', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = listQuerySchema.safeParse({
    page: singleQueryParam(req.query.page) ?? '1',
    limit: singleQueryParam(req.query.limit) ?? '20',
    sort: singleQueryParam(req.query.sort) ?? 'elo_desc',
  });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }
  const { page, limit, sort } = parsed.data;
  try {
    const total = await countPublicUsers(db);
    const rows = await listPublicPlayersWithStats(db, { page, limit, sort: sort as PublicListSort });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.status(200).json({
      data: rows.map((r) => ({
        id: r.id,
        displayName: r.display_name,
        level: levelFromEloRating(r.elo_rating),
        eloRating: r.elo_rating,
        steamId: r.steam_id,
        stats: {
          wins: 0,
          losses: 0,
          kdr: kdrOf(Number(r.kills), Number(r.deaths)),
        },
      })),
      meta: { total, page, limit, totalPages },
    });
  } catch (e) {
    next(e);
  }
});

/** PLAYAPI: perfil do utilizador autenticado (deve ficar antes de GET /players/:id para não capturar "me"). */
router.get('/players/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const uid = req.user!.id;
  try {
    const row = await findPublicProfileById(db, uid);
    if (!row) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    const { user, stats } = row;
    const kdr = kdrOf(stats.kills, stats.deaths);
    res.status(200).json({
      id: user.id,
      displayName: user.display_name,
      level: levelFromEloRating(user.elo_rating),
      eloRating: user.elo_rating,
      steamId: user.steam_id,
      role: user.role,
      createdAt: user.created_at,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        kills: stats.kills,
        deaths: stats.deaths,
        assists: stats.assists,
        kdr,
        headshots: 0,
        hsPercent: 0,
        mvps: 0,
        matchesPlayed: stats.matches_played,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/players/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const uid = req.user!.id;
  try {
    await updateUserDisplayName(db, uid, parsed.data.displayName);
    const fresh = await findUserById(db, uid);
    if (!fresh) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.status(200).json({
      id: fresh.id,
      displayName: fresh.display_name,
      level: levelFromEloRating(fresh.elo_rating),
      eloRating: fresh.elo_rating,
      steamId: fresh.steam_id,
      role: fresh.role,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/players/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  try {
    const row = await findPublicProfileById(db, id);
    if (!row) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    const { user, stats } = row;
    const kdr = kdrOf(stats.kills, stats.deaths);
    res.status(200).json({
      id: user.id,
      displayName: user.display_name,
      level: levelFromEloRating(user.elo_rating),
      eloRating: user.elo_rating,
      steamId: user.steam_id,
      role: user.role,
      createdAt: user.created_at,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        kills: stats.kills,
        deaths: stats.deaths,
        assists: stats.assists,
        kdr,
        headshots: 0,
        hsPercent: 0,
        mvps: 0,
        matchesPlayed: stats.matches_played,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.delete(
  '/players/:id',
  authMiddleware,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    if (req.user!.id === id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const bodyParsed = banBodySchema.safeParse(req.body && typeof req.body === 'object' ? req.body : {});
    if (!bodyParsed.success) {
      res.status(400).json({ error: 'Invalid body', details: bodyParsed.error.flatten() });
      return;
    }
    try {
      const target = await findUserById(db, id);
      if (!target) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      const reason = bodyParsed.data.reason ?? null;
      await db.transaction(async (trx) => {
        await banUser(trx, id, reason);
        await revokeAllForUser(trx, id);
      });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

router.get('/player/:steamid', playerPublicLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const steamid = req.params.steamid;
  if (!/^\d{17}$/.test(steamid)) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  try {
    const row = await findPlayerPublicBySteamId(db, steamid);
    if (!row) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.setHeader('Cache-Control', 'max-age=60');
    res.status(200).json({
      steamId: row.steam_id,
      displayName: row.display_name,
      level: levelFromEloRating(row.elo_rating),
      role: row.role,
    });
  } catch (e) {
    next(e);
  }
});

export default router;

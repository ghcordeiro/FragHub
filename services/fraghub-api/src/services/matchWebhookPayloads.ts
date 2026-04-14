import { z } from 'zod';

export type WebhookSource = 'matchzy' | 'get5';

export type NormalizedMatchPlayer = {
  steamId64: string;
  team: 'team1' | 'team2';
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvps: number;
  score: number;
  pingAvg: number | null;
  displayName: string | null;
};

export type NormalizedMatch = {
  source: WebhookSource;
  game: 'cs2' | 'csgo';
  externalMatchId: string;
  map: string;
  team1Score: number;
  team2Score: number;
  winner: 'team1' | 'team2' | 'draw';
  durationSeconds: number | null;
  serverIp: string | null;
  playedAt: Date;
  players: NormalizedMatchPlayer[];
};

const steam64 = z.string().regex(/^\d{17}$/);

const playerStats = z
  .object({
    kills: z.coerce.number().default(0),
    deaths: z.coerce.number().default(0),
    assists: z.coerce.number().default(0),
    headshots: z.coerce.number().optional(),
    mvp: z.coerce.number().optional(),
    mvps: z.coerce.number().optional(),
    score: z.coerce.number().default(0),
    ping: z.coerce.number().optional(),
    ping_avg: z.coerce.number().optional(),
  })
  .passthrough();

const playerRowArray = z.object({
  steamid: steam64,
  name: z.string().optional(),
  stats: playerStats,
});

const teamBlockArray = z.object({
  score: z.coerce.number().int().nonnegative(),
  players: z.array(playerRowArray).min(1),
});

const mapResultCore = z.object({
  event: z.literal('map_result'),
  matchid: z.coerce.number().int().positive(),
  map_number: z.coerce.number().int().nonnegative(),
  map_name: z.string().min(1).optional(),
  team1: teamBlockArray,
  team2: teamBlockArray,
  winner: z
    .object({
      team: z.enum(['team1', 'team2']),
    })
    .optional(),
});

const flexiblePlayers = z.union([z.array(z.record(z.unknown())), z.record(z.unknown())]);

const seriesEndTeam = z.object({
  series_score: z.coerce.number().int().nonnegative().optional(),
  score: z.coerce.number().int().nonnegative().optional(),
  stats: z.object({ players: flexiblePlayers }).optional(),
  players: flexiblePlayers.optional(),
});

const seriesEndCore = z.object({
  event: z.literal('series_end'),
  matchid: z.union([z.coerce.number(), z.string()]),
  map_name: z.string().min(1).optional(),
  team1: seriesEndTeam,
  team2: seriesEndTeam,
  winner: z
    .object({
      team: z.enum(['team1', 'team2']),
    })
    .optional(),
});

function isGet5PlayersRecord(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const t1 = (body as { team1?: { players?: unknown } }).team1;
  const p = t1?.players;
  return typeof p === 'object' && p !== null && !Array.isArray(p);
}

/** Converte `team*.players` de mapa SteamID→stats (Get5) para lista MatchZy-like. */
export function coerceGet5PlayersRecords(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  const src = body as Record<string, unknown>;
  if (src.event !== 'map_result') {
    return body;
  }
  const out: Record<string, unknown> = { ...src };
  for (const side of ['team1', 'team2'] as const) {
    const block = src[side] as { score?: unknown; players?: unknown } | undefined;
    if (!block || typeof block !== 'object') {
      continue;
    }
    const pl = block.players;
    if (pl && typeof pl === 'object' && !Array.isArray(pl)) {
      const players = Object.entries(pl as Record<string, unknown>).map(([steamid, stats]) => ({
        steamid,
        stats,
      }));
      out[side] = { ...block, players };
    }
  }
  return out;
}

function winnerFromScores(t1: number, t2: number): 'team1' | 'team2' | 'draw' {
  if (t1 === t2) {
    return 'draw';
  }
  return t1 > t2 ? 'team1' : 'team2';
}

function playersFromFlexible(raw: unknown, team: 'team1' | 'team2'): NormalizedMatchPlayer[] {
  if (raw === undefined || raw === null) {
    throw new Error(`Missing players for ${team}`);
  }
  if (Array.isArray(raw)) {
    return raw.map((p) => normalizePlayer(playerRowArray.parse(p), team));
  }
  return Object.entries(raw as Record<string, unknown>).map(([steamid, stats]) =>
    normalizePlayer(
      playerRowArray.parse({
        steamid,
        stats: typeof stats === 'object' && stats !== null ? stats : {},
      }),
      team,
    ),
  );
}

function parseGet5SeriesEnd(body: unknown): NormalizedMatch {
  const parsed = seriesEndCore.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid series_end payload: ${msg}`);
  }
  const b = parsed.data;
  const matchidStr = String(b.matchid).trim();
  const t1Raw = b.team1.stats?.players ?? b.team1.players;
  const t2Raw = b.team2.stats?.players ?? b.team2.players;
  if (!t1Raw || !t2Raw) {
    throw new Error('Invalid series_end: team players missing (use team.stats.players or team.players)');
  }
  const t1Score = b.team1.series_score ?? b.team1.score ?? 0;
  const t2Score = b.team2.series_score ?? b.team2.score ?? 0;
  const winner: 'team1' | 'team2' | 'draw' = b.winner?.team ?? winnerFromScores(t1Score, t2Score);
  const map = b.map_name?.trim() || 'series';
  return {
    source: 'get5',
    game: 'csgo',
    externalMatchId: `${matchidStr}-series`,
    map,
    team1Score: t1Score,
    team2Score: t2Score,
    winner,
    durationSeconds: null,
    serverIp: null,
    playedAt: new Date(),
    players: [...playersFromFlexible(t1Raw, 'team1'), ...playersFromFlexible(t2Raw, 'team2')],
  };
}

function normalizePlayer(row: z.infer<typeof playerRowArray>, team: 'team1' | 'team2'): NormalizedMatchPlayer {
  const st = row.stats;
  const headshots = Math.trunc(st.headshots ?? 0);
  const mvps = Math.trunc(st.mvps ?? st.mvp ?? 0);
  const ping = st.ping_avg ?? st.ping;
  return {
    steamId64: row.steamid,
    team,
    kills: Math.trunc(st.kills),
    deaths: Math.trunc(st.deaths),
    assists: Math.trunc(st.assists),
    headshots,
    mvps,
    score: Math.trunc(st.score),
    pingAvg: ping !== undefined ? Math.trunc(ping) : null,
    displayName: row.name ?? null,
  };
}

/** MATCHAPI-REQ-004/005 — `map_result` MatchZy/Get5; `series_end` Get5 (stats.players ou players). */
export function parseMatchWebhook(body: unknown): NormalizedMatch {
  if (body && typeof body === 'object' && (body as { event?: unknown }).event === 'series_end') {
    return parseGet5SeriesEnd(body);
  }
  const get5Style = isGet5PlayersRecord(body);
  const coerced = coerceGet5PlayersRecords(body);
  const base = mapResultCore.safeParse(coerced);
  if (!base.success) {
    const msg = base.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid webhook payload: ${msg}`);
  }
  const b = base.data;
  const source: WebhookSource = get5Style ? 'get5' : 'matchzy';
  const game: 'cs2' | 'csgo' = get5Style ? 'csgo' : 'cs2';
  const team1PlayersNorm = b.team1.players.map((p) => normalizePlayer(p, 'team1'));
  const team2PlayersNorm = b.team2.players.map((p) => normalizePlayer(p, 'team2'));
  const winner: 'team1' | 'team2' | 'draw' = b.winner?.team ?? winnerFromScores(b.team1.score, b.team2.score);
  const map = b.map_name?.trim() || 'unknown';
  const externalMatchId = `${String(b.matchid)}-${String(b.map_number)}`;

  return {
    source,
    game,
    externalMatchId,
    map,
    team1Score: b.team1.score,
    team2Score: b.team2.score,
    winner,
    durationSeconds: null,
    serverIp: null,
    playedAt: new Date(),
    players: [...team1PlayersNorm, ...team2PlayersNorm],
  };
}

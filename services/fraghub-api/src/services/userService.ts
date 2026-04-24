import type { Knex } from 'knex';

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  elo_rating: number;
  google_id: string | null;
  steam_id: string | null;
  banned_at: Date | string | null;
  banned_reason: string | null;
};

export type PublicListSort = 'elo_desc' | 'elo_asc' | 'name_asc';

export type PublicPlayerListRow = {
  id: number;
  display_name: string;
  steam_id: string | null;
  elo_rating: number;
  kills: number;
  deaths: number;
  assists: number;
  matches_played: number;
};

export async function findUserByEmail(trx: Knex, email: string): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ email }).first();
}

export async function findUserById(trx: Knex, id: number): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ id }).first();
}

export async function findUserByGoogleId(
  trx: Knex,
  googleId: string,
): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ google_id: googleId }).first();
}

export async function insertUser(
  trx: Knex,
  row: {
    email: string;
    password_hash: string;
    display_name: string;
    role: string;
    google_id?: string | null;
  },
): Promise<number> {
  const [insertId] = await trx('users').insert({
    email: row.email,
    password_hash: row.password_hash,
    display_name: row.display_name,
    role: row.role,
    google_id: row.google_id ?? null,
  });
  return Number(insertId);
}

export async function updateUserGoogleId(
  trx: Knex,
  userId: number,
  googleId: string,
): Promise<void> {
  await trx('users')
    .where({ id: userId })
    .update({ google_id: googleId, updated_at: trx.fn.now() });
}

export async function findUserBySteamId(trx: Knex, steamId: string): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ steam_id: steamId }).first();
}

export async function updateUserSteamId(trx: Knex, userId: number, steamId: string): Promise<void> {
  await trx('users').where({ id: userId }).update({ steam_id: steamId, updated_at: trx.fn.now() });
}

export async function clearUserSteamId(trx: Knex, userId: number): Promise<void> {
  await trx('users').where({ id: userId }).update({ steam_id: null, updated_at: trx.fn.now() });
}

export type PlayerPublicRow = {
  steam_id: string;
  display_name: string;
  role: string;
  elo_rating: number;
};

export async function findPlayerPublicBySteamId(
  trx: Knex,
  steamId: string,
): Promise<PlayerPublicRow | undefined> {
  return trx<PlayerPublicRow>('users')
    .select('steam_id', 'display_name', 'role', 'elo_rating')
    .where({ steam_id: steamId })
    .whereNull('banned_at')
    .first();
}

function orderClausePublicList(sort: PublicListSort): string {
  switch (sort) {
    case 'elo_desc':
      return 'u.elo_rating DESC, u.id ASC';
    case 'elo_asc':
      return 'u.elo_rating ASC, u.id ASC';
    case 'name_asc':
      return 'u.display_name ASC, u.id ASC';
    default:
      return 'u.elo_rating DESC, u.id ASC';
  }
}

export async function countPublicUsers(trx: Knex): Promise<number> {
  const row = await trx('users').whereNull('banned_at').count<{ cnt: string }>('id as cnt').first();
  return Number(row?.cnt ?? 0);
}

export async function listPublicPlayersWithStats(
  trx: Knex,
  opts: { page: number; limit: number; sort: PublicListSort },
): Promise<PublicPlayerListRow[]> {
  const offset = (opts.page - 1) * opts.limit;
  const order = orderClausePublicList(opts.sort);
  const [rows] = (await trx.raw(
    `
    SELECT u.id, u.display_name, u.steam_id, u.elo_rating,
           COALESCE(st.kills, 0) AS kills,
           COALESCE(st.deaths, 0) AS deaths,
           COALESCE(st.assists, 0) AS assists,
           COALESCE(st.matches_played, 0) AS matches_played
    FROM users u
    LEFT JOIN (
      SELECT user_id,
             SUM(kills) AS kills,
             SUM(deaths) AS deaths,
             SUM(assists) AS assists,
             COUNT(DISTINCT match_id) AS matches_played
      FROM stats
      GROUP BY user_id
    ) st ON st.user_id = u.id
    WHERE u.banned_at IS NULL
    ORDER BY ${order}
    LIMIT ? OFFSET ?
    `,
    [opts.limit, offset],
  )) as [PublicPlayerListRow[], unknown];
  return rows ?? [];
}

export type PublicProfileRow = {
  id: number;
  display_name: string;
  role: string;
  steam_id: string | null;
  elo_rating: number;
  created_at: Date | string;
};

export type PublicProfileStats = {
  kills: number;
  deaths: number;
  assists: number;
  matches_played: number;
};

export async function findPublicProfileById(
  trx: Knex,
  id: number,
): Promise<{ user: PublicProfileRow; stats: PublicProfileStats } | undefined> {
  const user = await trx<PublicProfileRow>('users')
    .select('id', 'display_name', 'role', 'steam_id', 'elo_rating', 'created_at')
    .where({ id })
    .whereNull('banned_at')
    .first();
  if (!user) {
    return undefined;
  }
  const agg = await trx('stats')
    .where({ user_id: id })
    .select(
      trx.raw('COALESCE(SUM(kills),0) as kills'),
      trx.raw('COALESCE(SUM(deaths),0) as deaths'),
      trx.raw('COALESCE(SUM(assists),0) as assists'),
      trx.raw('COUNT(DISTINCT match_id) as matches_played'),
    )
    .first();
  type StatsRow = {
    kills: string | number;
    deaths: string | number;
    assists: string | number;
    matches_played: string | number;
  };
  const row = agg as unknown as StatsRow | undefined;
  const kills = Number(row?.kills ?? 0);
  const deaths = Number(row?.deaths ?? 0);
  const assists = Number(row?.assists ?? 0);
  const matches_played = Number(row?.matches_played ?? 0);
  return {
    user,
    stats: { kills, deaths, assists, matches_played },
  };
}

export async function updateUserDisplayName(
  trx: Knex,
  userId: number,
  displayName: string,
): Promise<void> {
  await trx('users')
    .where({ id: userId })
    .update({ display_name: displayName, updated_at: trx.fn.now() });
}

export async function banUser(trx: Knex, userId: number, reason: string | null): Promise<void> {
  await trx('users').where({ id: userId }).update({
    banned_at: trx.fn.now(),
    banned_reason: reason,
    updated_at: trx.fn.now(),
  });
}

export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
  };
}

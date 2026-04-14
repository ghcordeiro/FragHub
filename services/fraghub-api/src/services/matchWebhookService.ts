import type { Knex } from 'knex';
import type { NormalizedMatch } from './matchWebhookPayloads';

export async function persistWebhookMatch(trx: Knex, rawBody: unknown, n: NormalizedMatch): Promise<number> {
  const payloadJson = JSON.stringify(rawBody);
  const insertResult = await trx('matches').insert({
    game: n.game,
    map: n.map,
    status: 'finished',
    external_match_id: n.externalMatchId,
    team1_score: n.team1Score,
    team2_score: n.team2Score,
    winner: n.winner,
    duration_seconds: n.durationSeconds,
    server_ip: n.serverIp,
    webhook_source: n.source,
    raw_payload: payloadJson,
    played_at: n.playedAt,
  });
  const matchId = Number(Array.isArray(insertResult) ? insertResult[0] : insertResult);
  for (const p of n.players) {
    const u = await trx('users').select('id').where({ steam_id: p.steamId64 }).whereNull('banned_at').first();
    await trx('stats').insert({
      match_id: matchId,
      user_id: u?.id ?? null,
      steam_id: p.steamId64,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      headshots: p.headshots,
      mvps: p.mvps,
      score: p.score,
      ping_avg: p.pingAvg,
    });
  }
  return matchId;
}

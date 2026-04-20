import { Knex } from 'knex';
import { levelFromEloRating } from '../utils/elo';
import logger from '../logger';

export interface EloChange {
  userId: string;
  displayName?: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  result: 'win' | 'loss';
}

function getKCoefficient(matchesCount: number): number {
  if (matchesCount < 10) return 40;
  if (matchesCount < 30) return 20;
  return 10;
}

function calculateExpectedWinProbability(playerElo: number, opponentAvgElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
}

export function calculateEloChange(
  playerElo: number,
  playerMatchesCount: number,
  opponentAvgElo: number,
  result: 'win' | 'loss',
): number {
  const K = getKCoefficient(playerMatchesCount);
  const expectedProb = calculateExpectedWinProbability(playerElo, opponentAvgElo);
  const actualResult = result === 'win' ? 1 : 0;
  return Math.round(K * (actualResult - expectedProb));
}

export function getLevelFromElo(elo: number): number {
  return levelFromEloRating(elo) ?? 1;
}

export async function updatePlayerEloOnMatch(
  matchId: string,
  _matchData: unknown,
  knex: Knex,
): Promise<EloChange[]> {
  try {
    const existingHistory = await knex('elo_history').where('match_id', matchId).limit(1);
    if (existingHistory.length > 0) {
      logger.info(`[ELO] Match ${matchId} already processed; skipping (idempotent)`);
      return [];
    }

    const match = await knex('matches').where('id', matchId).first();
    if (!match) {
      logger.warn(`[ELO] Match ${matchId} not found in DB; skipping`);
      return [];
    }
    if (match.winner === 'draw') {
      logger.info(`[ELO] Match ${matchId} is a draw; skipping ELO updates`);
      return [];
    }

    // Only update ELO for registered players (user_id not null)
    const stats = await knex('stats')
      .where('match_id', matchId)
      .whereNotNull('user_id')
      .select('user_id', 'team');

    const team1 = stats.filter((s: { team: string }) => s.team === 'team1');
    const team2 = stats.filter((s: { team: string }) => s.team === 'team2');

    if (team1.length === 0 || team2.length === 0) {
      logger.warn(`[ELO] Match ${matchId} has no registered players on one or both teams; skipping`);
      return [];
    }

    const userIds = stats.map((s: { user_id: number }) => s.user_id);
    const users = await knex('users')
      .whereIn('id', userIds)
      .select('id', 'elo_rating', 'display_name');
    const userMap = new Map(users.map((u: { id: number; elo_rating: number; display_name: string | null }) => [u.id, u]));

    const eloChanges: EloChange[] = [];

    await knex.transaction(async (trx) => {
      for (const stat of stats) {
        const user = userMap.get(stat.user_id);
        if (!user) continue;

        const currentElo: number = user.elo_rating || 1000;
        const playerResult: 'win' | 'loss' = match.winner === stat.team ? 'win' : 'loss';
        const opponents = stat.team === 'team1' ? team2 : team1;
        const opponentAvgElo =
          opponents
            .map((op: { user_id: number }) => userMap.get(op.user_id)?.elo_rating || 1000)
            .reduce((sum: number, elo: number) => sum + elo, 0) / opponents.length;

        const matchCount = await trx('elo_history')
          .where('user_id', stat.user_id)
          .count('* as cnt')
          .first();
        const playerMatchesCount = Number(matchCount?.cnt ?? 0);

        const delta = calculateEloChange(currentElo, playerMatchesCount, opponentAvgElo, playerResult);
        const newElo = Math.max(0, currentElo + delta);

        await trx('users').where('id', stat.user_id).update({ elo_rating: newElo });

        await trx('elo_history').insert({
          user_id: stat.user_id,
          match_id: matchId,
          elo_before: currentElo,
          elo_after: newElo,
          change: delta,
          result: playerResult,
        });

        eloChanges.push({
          userId: String(stat.user_id),
          displayName: user.display_name ?? undefined,
          eloBefore: currentElo,
          eloAfter: newElo,
          change: delta,
          result: playerResult,
        });

        logger.info(
          `[ELO] Match ${matchId} - Player ${stat.user_id} (${user.display_name}): ${currentElo} → ${newElo} (${playerResult})`,
        );
      }
    });

    logger.info(`[ELO] Match ${matchId} completed: ${eloChanges.length} players updated`);
    return eloChanges;
  } catch (error) {
    logger.error(`[ELO] Failed to update ELO for match ${matchId}:`, error);
    throw error;
  }
}

export default {
  calculateEloChange,
  getLevelFromElo,
  updatePlayerEloOnMatch,
};

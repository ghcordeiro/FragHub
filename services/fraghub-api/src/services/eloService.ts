import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { levelFromEloRating } from '../utils/elo';
import logger from '../logger';

/**
 * ELO System Service (Phase 5 Matchmaking)
 *
 * Implements simplified Glicko-2 algorithm with:
 * - Adaptive K coefficient (40 for new players, 20 for active, 10 for experienced)
 * - Expected win probability calculation
 * - Atomic ELO updates with idempotency
 * - Level mapping (1-10) per ELO-REQ-004
 */

export interface EloChange {
  userId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  result: 'win' | 'loss';
}

/**
 * Calculate K coefficient based on player match count
 * ELO-REQ-002: Adaptive K-coefficient
 * - K=40: < 10 matches (new players, volatile)
 * - K=20: 10-30 matches (active players)
 * - K=10: > 30 matches (experienced players, stable)
 */
function getKCoefficient(matchesCount: number): number {
  if (matchesCount < 10) return 40;
  if (matchesCount < 30) return 20;
  return 10;
}

/**
 * Calculate expected win probability using simplified Glicko-2 formula
 * Formula: 1 / (1 + 10^((opponentAvgElo - playerElo) / 400))
 */
function calculateExpectedWinProbability(playerElo: number, opponentAvgElo: number): number {
  const exponent = (opponentAvgElo - playerElo) / 400;
  return 1 / (1 + Math.pow(10, exponent));
}

/**
 * Calculate ELO change for a single player in a match
 * ELO-REQ-002, ELO-REQ-007
 *
 * Delta = K × (result - expectedProb), clamped at 0 minimum
 * where result = 1 for win, 0 for loss
 */
export function calculateEloChange(
  playerElo: number,
  playerMatchesCount: number,
  opponentAvgElo: number,
  result: 'win' | 'loss'
): number {
  const K = getKCoefficient(playerMatchesCount);
  const expectedProb = calculateExpectedWinProbability(playerElo, opponentAvgElo);
  const actualResult = result === 'win' ? 1 : 0;

  // Delta = K × (result - expectedProb)
  const delta = K * (actualResult - expectedProb);

  // ELO-REQ-007: Ensure delta is at least 0 (no negative ELO changes? Actually, ELO can decrease)
  // Reread: "clamped at 0 minimum" likely means final ELO >= 0, not that delta >= 0
  // So we return delta (can be negative), and clamp final ELO to 0 later
  return Math.round(delta);
}

/**
 * Get level from ELO rating
 * Wrapper around levelFromEloRating for consistency
 */
export function getLevelFromElo(elo: number): number {
  const level = levelFromEloRating(elo);
  return level ?? 1; // Fallback to level 1 if null
}

/**
 * Update player ELO atomically after match completion
 * Called via webhook after match data received
 *
 * ELO-REQ-003, ELO-REQ-005, ELO-REQ-006, ELO-NFR-001, ELO-NFR-002
 *
 * - Validates match exists
 * - Extracts team composition and results
 * - For each player: calculates ELO change, updates rating, inserts history
 * - Uses transaction for atomicity
 * - Implements idempotency: check if match_id already in elo_history
 */
export async function updatePlayerEloOnMatch(
  matchId: string,
  matchData: any,
  knex: Knex
): Promise<void> {
  try {
    // ELO-NFR-002: Idempotency check
    const existingHistory = await knex('elo_history')
      .where('match_id', matchId)
      .limit(1);

    if (existingHistory.length > 0) {
      logger.info(`[ELO] Match ${matchId} already processed; skipping ELO updates (idempotent)`);
      return;
    }

    // Extract team composition and results from match_data
    // Expected structure: { team0: [...], team1: [...], winner: 'ct' | 't' | 'draw', ... }
    const { team0, team1, winner, ct_score, t_score } = matchData;

    if (!team0 || !team1 || !Array.isArray(team0) || !Array.isArray(team1)) {
      logger.warn(`[ELO] Invalid match data for match ${matchId}; skipping ELO updates`);
      return;
    }

    if (team0.length !== 5 || team1.length !== 5) {
      logger.warn(`[ELO] Match ${matchId} does not have exactly 5v5 teams; skipping ELO updates`);
      return;
    }

    // Determine winning team
    let winningTeam: 'team0' | 'team1' | null = null;
    if (winner === 'ct' || winner === 'CT' || t_score < ct_score) {
      winningTeam = 'team0';
    } else if (winner === 't' || winner === 'T' || ct_score < t_score) {
      winningTeam = 'team1';
    } else {
      logger.warn(`[ELO] Match ${matchId} has unclear winner (draw?); skipping ELO updates`);
      return;
    }

    // Collect all players and their teams
    const playersData: Array<{ userId: string; team: 'team0' | 'team1' }> = [];
    for (const playerId of team0) {
      playersData.push({ userId: playerId, team: 'team0' });
    }
    for (const playerId of team1) {
      playersData.push({ userId: playerId, team: 'team1' });
    }

    // Fetch all user ELO ratings and match counts
    const users = await knex('users')
      .whereIn('id', playersData.map(p => p.userId))
      .select('id', 'elo_rating', 'displayName');

    const userMap = new Map(users.map(u => [u.id, u]));

    // Prepare ELO updates in transaction
    const eloChanges: EloChange[] = [];

    await knex.transaction(async (trx) => {
      for (const playerData of playersData) {
        const user = userMap.get(playerData.userId);
        if (!user) {
          logger.warn(`[ELO] User ${playerData.userId} not found in match ${matchId}; skipping`);
          continue;
        }

        const currentElo = user.elo_rating || 1000;
        const playerResult = playerData.team === winningTeam ? 'win' : 'loss';

        // Calculate opponent average ELO (opposite team)
        const opponentTeam = playerData.team === 'team0' ? team1 : team0;
        const opponentElos = opponentTeam
          .map(id => userMap.get(id)?.elo_rating || 1000)
          .reduce((sum, elo) => sum + elo, 0) / opponentTeam.length;

        // Count player's previous matches
        const matchCount = await trx('elo_history')
          .where('user_id', playerData.userId)
          .count('* as cnt')
          .first();
        const playerMatchesCount = matchCount?.cnt || 0;

        // Calculate ELO change
        const delta = calculateEloChange(currentElo, playerMatchesCount, opponentElos, playerResult);
        const newElo = Math.max(0, currentElo + delta); // ELO-REQ-007: minimum 0

        // Update user ELO
        await trx('users')
          .where('id', playerData.userId)
          .update({ elo_rating: newElo });

        // Insert ELO history record
        await trx('elo_history').insert({
          id: uuidv4(),
          user_id: playerData.userId,
          match_id: matchId,
          elo_before: currentElo,
          elo_after: newElo,
          change: newElo - currentElo,
          result: playerResult,
          timestamp: new Date(),
        });

        eloChanges.push({
          userId: playerData.userId,
          eloBefore: currentElo,
          eloAfter: newElo,
          change: newElo - currentElo,
          result: playerResult,
        });

        logger.info(
          `[ELO] Match ${matchId} - Player ${playerData.userId} (${user.displayName}): ${currentElo} → ${newElo} (${playerResult})`
        );
      }
    });

    logger.info(
      `[ELO] Match ${matchId} completed: ${eloChanges.length} players updated`
    );
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

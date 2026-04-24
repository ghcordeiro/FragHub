import logger from '../logger';
import { loadEnv } from '../config/env';

/**
 * Discord Notification Service (Phase 5 Matchmaking)
 *
 * Sends match notifications to Discord via webhook
 * - Graceful degradation: optional webhook URL, non-blocking errors
 * - Fire-and-forget: notifications don't block responses
 * - NOTIF-REQ-001 through NOTIF-REQ-008
 */

interface User {
  id: string;
  displayName: string;
  elo_rating?: number;
  role?: string;
}

interface TeamComposition {
  teamA: User[];
  teamB: User[];
}

interface MatchCompleteResult {
  winner: 'TEAM_A' | 'TEAM_B';
  score: { teamA: number; teamB: number };
  mvp: User;
  eloChanges: Array<{ user: User; change: number }>;
}

/**
 * Get level from ELO rating (inline copy to avoid circular dependency)
 */
function getLevelFromElo(elo: number | undefined): number {
  if (!elo) return 1;
  const level = Math.min(10, Math.max(1, Math.floor((elo - 600) / 80) + 1));
  return level;
}

/**
 * Send HTTP request with timeout via AbortController
 * NOTIF-NFR-001: 5-second timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const timeout = options.timeout || 5000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);
    return response;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}

/**
 * Mask webhook URL for logging (show first 10 chars + ...)
 */
function maskUrl(url: string): string {
  if (url.length <= 10) return '...';
  return url.substring(0, 10) + '...';
}

/**
 * Notify match is ready (teams formed, map selected)
 * NOTIF-REQ-001, NOTIF-REQ-004
 *
 * Discord embed format:
 * - Title: 🎮 Match Ready!
 * - Fields: Team A, Team B, Map, Connect
 * - Color: Green (0x00AA00)
 */
export async function notifyMatchReady(
  teams: TeamComposition,
  map: string,
  connectString: string,
): Promise<void> {
  const env = loadEnv();

  if (!env.DISCORD_WEBHOOK_URL) {
    logger.debug('[Discord] Webhook not configured; match ready notification skipped');
    return;
  }

  const embed = {
    title: '🎮 Match Ready!',
    description: 'Teams are formed and ready to start.',
    color: 0x00aa00, // Green
    fields: [
      {
        name: 'Team A',
        value: teams.teamA
          .map((p) => `${p.displayName} [${getLevelFromElo(p.elo_rating)}]`)
          .join('\n'),
        inline: true,
      },
      {
        name: 'Team B',
        value: teams.teamB
          .map((p) => `${p.displayName} [${getLevelFromElo(p.elo_rating)}]`)
          .join('\n'),
        inline: true,
      },
      {
        name: 'Map',
        value: map,
        inline: false,
      },
      {
        name: 'Connect',
        value: `\`${connectString}\``,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget notification
  fetchWithTimeout(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
    timeout: 5000,
  })
    .then((response) => {
      if (!response.ok) {
        logger.warn(
          `[Discord] Match ready notification failed: HTTP ${response.status} from ${maskUrl(env.DISCORD_WEBHOOK_URL!)}`,
        );
      } else {
        logger.debug('[Discord] Match ready notification sent');
      }
    })
    .catch((error) => {
      logger.warn(
        `[Discord] Match ready notification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
}

/**
 * Notify match is complete (result, MVP, ELO deltas)
 * NOTIF-REQ-002, NOTIF-REQ-004
 *
 * Discord embed format:
 * - Title: ✅ Match Completed!
 * - Fields: Winner, Score, MVP, ELO Changes (top 3 gains + losses)
 * - Color: Blue (0x0000AA)
 */
export async function notifyMatchComplete(result: MatchCompleteResult): Promise<void> {
  const env = loadEnv();

  if (!env.DISCORD_WEBHOOK_URL) {
    logger.debug('[Discord] Webhook not configured; match complete notification skipped');
    return;
  }

  // Sort ELO changes by delta (descending)
  const sorted = [...result.eloChanges].sort((a, b) => b.change - a.change);

  // Top 3 gainers
  const topGains = sorted
    .filter((e) => e.change > 0)
    .slice(0, 3)
    .map((e) => `${e.user.displayName}: +${e.change} ELO`)
    .join('\n');

  // Top 3 losers
  const topLosses = sorted
    .filter((e) => e.change < 0)
    .slice(0, 3)
    .map((e) => `${e.user.displayName}: ${e.change} ELO`)
    .join('\n');

  const eloChangesValue = [topGains, topLosses].filter(Boolean).join('\n');

  const embed = {
    title: '✅ Match Completed!',
    description: `Winner: ${result.winner === 'TEAM_A' ? 'Team A' : 'Team B'}`,
    color: 0x0000aa, // Blue
    fields: [
      {
        name: 'Score',
        value: `Team A: ${result.score.teamA} - Team B: ${result.score.teamB}`,
        inline: false,
      },
      {
        name: 'MVP',
        value: `${result.mvp.displayName} [${getLevelFromElo(result.mvp.elo_rating)}]`,
        inline: false,
      },
      {
        name: 'ELO Changes',
        value: eloChangesValue || 'No changes',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget notification
  fetchWithTimeout(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
    timeout: 5000,
  })
    .then((response) => {
      if (!response.ok) {
        logger.warn(
          `[Discord] Match complete notification failed: HTTP ${response.status} from ${maskUrl(env.DISCORD_WEBHOOK_URL!)}`,
        );
      } else {
        logger.debug('[Discord] Match complete notification sent');
      }
    })
    .catch((error) => {
      logger.warn(
        `[Discord] Match complete notification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
}

export default {
  notifyMatchReady,
  notifyMatchComplete,
};

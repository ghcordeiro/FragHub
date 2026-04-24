import type { Env } from '../config/env';

export type MatchDiscordSummary = {
  map: string;
  team1Score: number;
  team2Score: number;
  winner: string;
  topFragger: string;
};

export async function notifyDiscordMatchRecorded(
  env: Env,
  summary: MatchDiscordSummary,
): Promise<void> {
  const url = env.DISCORD_WEBHOOK_URL;
  if (!url) {
    return;
  }
  const content = `**FragHub** — partida registada\nMapa: **${summary.map}** | ${String(summary.team1Score)}–${String(summary.team2Score)} | vencedor: **${summary.winner}**\nTop fragger: **${summary.topFragger}**`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.warn(`[discord] HTTP ${String(res.status)} ao enviar notificação`);
    }
  } catch (e) {
    console.warn('[discord] falha ao enviar notificação', e);
  }
}

import fs from 'node:fs';
import path from 'node:path';

export interface LivePlayer {
  accountId: string;
  name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  score: number;
}

export interface LiveTeam {
  name: string;
  side: 'CT' | 'T';
  score: number;
  players: LivePlayer[];
}

export interface LiveMatch {
  matchId: string;
  map: string;
  round: number;
  team1: LiveTeam;
  team2: LiveTeam;
  lastUpdate: string;
}

function parsePlayers(raw: unknown): LivePlayer[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([accountId, stats]) => {
    const s = (typeof stats === 'object' && stats !== null ? stats : {}) as Record<string, unknown>;
    return {
      accountId,
      name: typeof s.name === 'string' ? s.name : null,
      kills: Number(s.kills ?? 0),
      deaths: Number(s.deaths ?? 0),
      assists: Number(s.assists ?? 0),
      mvps: Number(s.mvps ?? 0),
      score: Number(s.score ?? 0),
    };
  });
}

function parseBackup(data: Record<string, unknown>): LiveMatch {
  return {
    matchId: String(data.matchid ?? ''),
    map: String(data.map_name ?? 'unknown'),
    round: Number(data.round ?? 0),
    team1: {
      name: String(data.team1_name ?? 'Team 1'),
      side: String(data.team1_side) === 'CT' ? 'CT' : 'T',
      score: Number(data.team1_score ?? 0),
      players: parsePlayers(data.PlayersOnTeam1),
    },
    team2: {
      name: String(data.team2_name ?? 'Team 2'),
      side: String(data.team2_side) === 'CT' ? 'CT' : 'T',
      score: Number(data.team2_score ?? 0),
      players: parsePlayers(data.PlayersOnTeam2),
    },
    lastUpdate: String(data.timestamp ?? ''),
  };
}

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 horas

export function getLatestLiveMatch(backupDir: string): LiveMatch | null {
  if (!fs.existsSync(backupDir)) return null;

  let files: string[];
  try {
    files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  } catch {
    return null;
  }

  if (files.length === 0) return null;

  const sorted = files
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (Date.now() - sorted[0].mtime > STALE_THRESHOLD_MS) return null;

  try {
    const content = fs.readFileSync(path.join(backupDir, sorted[0].name), 'utf-8');
    return parseBackup(JSON.parse(content) as Record<string, unknown>);
  } catch {
    return null;
  }
}

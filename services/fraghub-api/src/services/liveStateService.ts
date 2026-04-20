export interface LivePlayerState {
  steamId: string;
  name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  score: number;
  mvp: number;
}

export interface LiveTeamState {
  name: string;
  score: number;
  players: LivePlayerState[];
}

export interface LiveState {
  matchId: number;
  mapNumber: number;
  mapName?: string;
  round: number;
  team1: LiveTeamState;
  team2: LiveTeamState;
  updatedAt: string;
}

let current: LiveState | null = null;

export function setLiveState(state: LiveState): void {
  current = state;
}

export function clearLiveState(): void {
  current = null;
}

export function getLiveState(): LiveState | null {
  return current;
}

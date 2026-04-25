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
  lossBonus: number;
  players: LivePlayerState[];
}

export interface LiveState {
  matchId: number;
  mapNumber: number;
  mapName?: string;
  round: number;
  roundHistory: Array<'team1' | 'team2'>;
  team1: LiveTeamState;
  team2: LiveTeamState;
  updatedAt: string;
}

const LOSS_BONUS = [1400, 1900, 2400, 2900, 3400];

let current: Omit<LiveState, 'roundHistory' | 'team1' | 'team2'> & {
  team1: Omit<LiveTeamState, 'lossBonus'>;
  team2: Omit<LiveTeamState, 'lossBonus'>;
} | null = null;
let roundHistory: Array<'team1' | 'team2'> = [];
let consecutiveLosses = { team1: 0, team2: 0 };

export function setLiveState(
  state: Omit<LiveState, 'roundHistory' | 'team1' | 'team2'> & {
    team1: Omit<LiveTeamState, 'lossBonus'>;
    team2: Omit<LiveTeamState, 'lossBonus'>;
  },
  roundWinner: 'team1' | 'team2' | null,
): void {
  if (roundWinner !== null) {
    roundHistory.push(roundWinner);
    const loser = roundWinner === 'team1' ? 'team2' : 'team1';
    consecutiveLosses[roundWinner] = 0;
    consecutiveLosses[loser] += 1;
  }
  current = state;
}

export function clearLiveState(): void {
  current = null;
  roundHistory = [];
  consecutiveLosses = { team1: 0, team2: 0 };
}

export function getLiveState(): LiveState | null {
  if (!current) return null;
  return {
    ...current,
    roundHistory: [...roundHistory],
    team1: { ...current.team1, lossBonus: LOSS_BONUS[Math.min(consecutiveLosses.team1, 4)] },
    team2: { ...current.team2, lossBonus: LOSS_BONUS[Math.min(consecutiveLosses.team2, 4)] },
  };
}

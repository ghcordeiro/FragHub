export interface Match {
  id: number
  game: 'cs2' | 'csgo'
  map: string
  team1Score: number
  team2Score: number
  winner: 'team1' | 'team2' | 'draw'
  durationSeconds: number | null
  playedAt: string
  playerCount: number
}

export interface MatchPlayer {
  steamId: string
  displayName: string | null
  team: 'team1' | 'team2'
  kills: number
  deaths: number
  assists: number
  headshots: number
  mvps: number
  score: number
  kdr: number
}

export interface MatchDetail {
  id: number
  game: string
  map: string
  team1Score: number
  team2Score: number
  winner: 'team1' | 'team2' | 'draw'
  durationSeconds: number | null
  playedAt: string
  players: MatchPlayer[]
}

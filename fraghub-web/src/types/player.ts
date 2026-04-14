export interface Player {
  id: string
  name: string
  email?: string
  steamId?: string | null
  avatarUrl?: string | null
  level: number
  elo: number
  totalMatches: number
  wins: number
  winPercentage: number
  kdRatio: number
  hsPercentage: number
}

export interface MatchRecord {
  id: string
  date: Date
  map: string
  result: 'win' | 'loss' | 'tie'
  kills: number
  deaths: number
  kdRatio: number
  hsPercentage: number
}

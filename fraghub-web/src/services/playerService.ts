import { httpClient } from './http'
import type { Player, MatchRecord } from '@/types/player'

interface PlayerProfileApi {
  id: number
  displayName: string
  level: number
  eloRating: number
  steamId: string | null
  role?: string
  createdAt?: string
  stats?: {
    wins: number
    losses: number
    draws?: number
    kills?: number
    deaths?: number
    assists?: number
    kdr: number
    matchesPlayed: number
    hsPercent?: number
  }
}

export interface PlayerStatsApi {
  matchesPlayed: number
  wins: number
  losses: number
  draws: number
  kills: number
  deaths: number
  assists: number
  headshots: number
  mvps: number
  kdr: number
  hsPercent: number
  avgKillsPerMatch: number
}

interface MatchRecordApi {
  matchId: number
  game: string
  map: string
  team1Score: number
  team2Score: number
  winner: string
  playedAt: string
  yourStats: {
    team: string
    kills: number
    deaths: number
    assists: number
  }
}

interface PlayerMatchesApiResponse {
  data: MatchRecordApi[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

function mapProfileApiToPlayer(p: PlayerProfileApi): Player {
  const wins = p.stats?.wins ?? 0
  const losses = p.stats?.losses ?? 0
  const played = p.stats?.matchesPlayed ?? wins + losses
  return {
    id: String(p.id),
    name: p.displayName,
    steamId: p.steamId,
    level: p.level,
    elo: p.eloRating,
    totalMatches: played,
    wins,
    winPercentage: played > 0 ? Math.round((wins / played) * 1000) / 10 : 0,
    kdRatio: p.stats?.kdr ?? 0,
    hsPercentage: p.stats?.hsPercent ?? 0,
  }
}

function mapMatchApiToRecord(r: MatchRecordApi): MatchRecord {
  const kills = r.yourStats.kills
  const deaths = r.yourStats.deaths
  const kdRatio = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills
  const result: 'win' | 'loss' | 'tie' =
    r.winner === 'draw' ? 'tie' : r.winner === r.yourStats.team ? 'win' : 'loss'
  return {
    id: String(r.matchId),
    date: new Date(r.playedAt),
    map: r.map,
    result,
    kills,
    deaths,
    kdRatio,
    hsPercentage: 0,
  }
}

export const playerService = {
  async getPlayer(id: string): Promise<Player> {
    const raw = await httpClient.get<PlayerProfileApi>(`/api/players/${id}`)
    return mapProfileApiToPlayer(raw)
  },

  async getCurrentPlayer(): Promise<Player> {
    const raw = await httpClient.get<PlayerProfileApi>('/api/players/me')
    return mapProfileApiToPlayer(raw)
  },

  async updatePlayerName(name: string): Promise<Player> {
    const raw = await httpClient.patch<PlayerProfileApi>('/api/players/me', { displayName: name })
    return mapProfileApiToPlayer(raw)
  },

  async getPlayerStats(playerId: string): Promise<PlayerStatsApi> {
    return httpClient.get<PlayerStatsApi>(`/api/players/${playerId}/stats`)
  },

  async getPlayerMatches(
    playerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MatchRecord[]; totalPages: number; total: number }> {
    const response = await httpClient.get<PlayerMatchesApiResponse>(
      `/api/players/${playerId}/matches?page=${page}&limit=${limit}`,
    )
    return {
      data: response.data.map(mapMatchApiToRecord),
      totalPages: response.meta.totalPages,
      total: response.meta.total,
    }
  },
}

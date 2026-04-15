import { httpClient } from './http'
import type { Player, MatchRecord } from '@/types/player'

/** Corpo de GET /api/players/:id ou GET /api/players/me; PATCH /players/me pode omitir stats. */
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

  getPlayerMatches(playerId: string, page: number = 1, limit: number = 10): Promise<MatchRecord[]> {
    return httpClient.get(`/api/players/${playerId}/matches?page=${page}&limit=${limit}`)
  },
}

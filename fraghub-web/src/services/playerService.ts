import { httpClient } from './http'
import type { Player, MatchRecord } from '@/types/player'

export const playerService = {
  getPlayer(id: string): Promise<Player> {
    return httpClient.get(`/api/players/${id}`)
  },

  getCurrentPlayer(): Promise<Player> {
    return httpClient.get('/api/players/me')
  },

  updatePlayerName(name: string): Promise<Player> {
    return httpClient.patch('/api/players/me', { name })
  },

  getPlayerMatches(playerId: string, page: number = 1, limit: number = 10): Promise<MatchRecord[]> {
    return httpClient.get(`/api/players/${playerId}/matches?page=${page}&limit=${limit}`)
  },
}

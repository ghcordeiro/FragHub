import { httpClient } from './http'
import type { Player } from '@/types/player'

export interface LeaderboardResponse {
  players: Player[]
  total: number
}

export const leaderboardService = {
  getLeaderboard(
    page: number = 1,
    limit: number = 25,
    game: string = 'all',
    period: string = 'all'
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({
      sort: 'elo',
      order: 'desc',
      page: String(page),
      limit: String(limit),
      game,
      period,
    })
    return httpClient.get(`/api/players?${params.toString()}`)
  },
}

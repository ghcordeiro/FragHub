import { httpClient } from './http'
import type { Match, MatchDetail } from '@/types/match'

interface MatchesApiResponse {
  data: Match[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const matchService = {
  async getMatches(
    page: number = 1,
    limit: number = 20,
    game?: string,
    map?: string,
  ): Promise<{ matches: Match[]; total: number; totalPages: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (game && game !== 'all') params.set('game', game)
    if (map) params.set('map', map)
    const raw = await httpClient.get<MatchesApiResponse>(`/api/matches?${params.toString()}`)
    return {
      matches: raw.data ?? [],
      total: raw.meta?.total ?? 0,
      totalPages: raw.meta?.totalPages ?? 1,
    }
  },

  async getMatch(id: string): Promise<MatchDetail> {
    return httpClient.get<MatchDetail>(`/api/matches/${id}`)
  },
}

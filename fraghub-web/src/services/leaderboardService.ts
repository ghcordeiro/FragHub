import { httpClient } from './http'
import type { Player } from '@/types/player'

export interface LeaderboardResponse {
  players: Player[]
  total: number
}

/** Resposta de GET /api/players (fraghub-api). */
interface PlayersListApiRow {
  id: number
  displayName: string
  level: number
  eloRating: number
  steamId: string | null
  stats: { wins: number; losses: number; kdr: number }
}

interface PlayersListApiResponse {
  data: PlayersListApiRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

function mapListRowToPlayer(r: PlayersListApiRow): Player {
  const wins = r.stats?.wins ?? 0
  const losses = r.stats?.losses ?? 0
  const played = wins + losses
  return {
    id: String(r.id),
    name: r.displayName,
    steamId: r.steamId,
    level: r.level,
    elo: r.eloRating,
    totalMatches: played,
    wins,
    winPercentage: played > 0 ? Math.round((wins / played) * 1000) / 10 : 0,
    kdRatio: r.stats?.kdr ?? 0,
    hsPercentage: 0,
  }
}

export const leaderboardService = {
  async getLeaderboard(
    page: number = 1,
    limit: number = 25,
    _game: string = 'all',
    _period: string = 'all'
  ): Promise<LeaderboardResponse> {
    // API aceita apenas sort ∈ elo_desc | elo_asc | name_asc (ver players.ts listQuerySchema).
    const params = new URLSearchParams({
      sort: 'elo_desc',
      page: String(page),
      limit: String(limit),
    })
    const raw = await httpClient.get<PlayersListApiResponse>(`/players?${params.toString()}`)
    return {
      players: (raw.data ?? []).map(mapListRowToPlayer),
      total: raw.meta?.total ?? 0,
    }
  },
}

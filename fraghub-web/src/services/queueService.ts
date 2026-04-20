import { httpClient } from './http'

export type QueueStateType =
  | 'NOT_IN_QUEUE'
  | 'WAITING_PLAYERS'
  | 'PLAYERS_FOUND'
  | 'MAP_VOTE'
  | 'IN_PROGRESS'
  | 'FINISHED'

export interface QueuePlayer {
  id: string
  displayName: string
  elo: number
  level: number
}

export interface VetoState {
  banHistory: Array<{ banningTeam: string; map: string }>
  remainingMaps: string[]
  currentTurn: 'TEAM_A' | 'TEAM_B'
  isCaptain: boolean
}

export interface QueueStatus {
  state: QueueStateType
  queueSessionId?: string
  matchReady?: boolean
  position?: number
  totalInQueue?: number
  teamA?: QueuePlayer[]
  teamB?: QueuePlayer[]
  avgEloA?: number
  avgEloB?: number
  mapSelected?: string
  connectString?: string
  vetoState?: VetoState
}

export const queueService = {
  getStatus(): Promise<QueueStatus> {
    return httpClient.get<QueueStatus>('/api/queue/status')
  },

  join(): Promise<{ position: number; totalInQueue: number }> {
    return httpClient.post('/api/queue/join')
  },

  leave(): Promise<void> {
    return httpClient.post('/api/queue/leave')
  },

  banMap(queueSessionId: string, map: string): Promise<void> {
    return httpClient.post('/api/queue/vote-map', { action: 'ban', map, queueSessionId })
  },
}

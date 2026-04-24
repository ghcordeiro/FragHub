import { httpClient } from './http'

export interface LivePlayer {
  steamId: string
  name: string | null
  kills: number
  deaths: number
  assists: number
  headshots: number
  score: number
  mvp: number
}

export interface LiveTeam {
  name: string
  score: number
  players: LivePlayer[]
}

export interface LiveMatch {
  isLive: true
  matchId: number
  mapNumber: number
  mapName?: string
  round: number
  team1: LiveTeam
  team2: LiveTeam
  updatedAt: string
}

export interface NoLiveMatch {
  isLive: false
}

export type LiveResponse = LiveMatch | NoLiveMatch

export const liveService = {
  get: () => httpClient.get<LiveResponse>('/live'),
}

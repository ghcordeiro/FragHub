import { httpClient } from './http'

// --- Dashboard ---

export interface DashboardMetrics {
  total_players: number
  matches_today: number
  servers_online: number
  recent_logs: Array<{
    id: number
    action_type: string
    target_type?: string
    target_id?: number | null
    created_at: string
  }>
}

export const adminService = {
  // Dashboard
  getDashboard(): Promise<{ data: DashboardMetrics }> {
    return httpClient.get('/api/admin/dashboard')
  },

  // Players
  getPlayers(params: { page: number; limit: number; search?: string }): Promise<{
    data: Array<{
      id: number
      email: string
      display_name: string
      role: string
      banned_at: string | null
      created_at: string
    }>
    pagination: { page: number; limit: number; total: number }
  }> {
    const p = new URLSearchParams({ page: String(params.page), limit: String(params.limit) })
    if (params.search) p.set('search', params.search)
    return httpClient.get(`/api/admin/players?${p.toString()}`)
  },

  banPlayer(playerId: number, reason: string, durationDays: number | null = null): Promise<unknown> {
    return httpClient.post('/api/admin/players/ban', { player_id: playerId, reason, duration_days: durationDays })
  },

  unbanPlayer(playerId: number): Promise<unknown> {
    return httpClient.post('/api/admin/players/unban', { player_id: playerId })
  },

  unlinkSteam(playerId: number | string): Promise<unknown> {
    return httpClient.delete(`/api/admin/players/${playerId}/steam`)
  },

  // Servers
  getServers(): Promise<{
    data: Array<{
      id: string
      name: string
      service: string
      status: 'online' | 'offline'
      players_connected: number
      uptime: string
    }>
  }> {
    return httpClient.get('/api/admin/servers')
  },

  controlServer(serverId: string, action: 'start' | 'stop' | 'restart'): Promise<unknown> {
    return httpClient.post(`/api/admin/servers/${serverId}/${action}`)
  },

  sendRcon(serverId: string, command: string): Promise<{ data: { output: string } }> {
    return httpClient.post(`/api/admin/servers/${serverId}/rcon`, { command })
  },

  // Logs
  getLogs(params: { page: number; limit: number; actionType?: string }): Promise<{
    data: Array<{
      id: number
      admin_id: number
      action_type: string
      target_type?: string
      target_id?: number
      details: Record<string, unknown>
      ip_address?: string
      created_at: string
    }>
    pagination: { page: number; limit: number; total: number }
  }> {
    const p = new URLSearchParams({ page: String(params.page), limit: String(params.limit) })
    if (params.actionType) p.set('action_type', params.actionType)
    return httpClient.get(`/api/admin/logs?${p.toString()}`)
  },

  // Plugin Config
  getPluginList(serverId: string): Promise<{ data: { plugins: string[] } }> {
    return httpClient.get(`/api/admin/servers/${serverId}/config`)
  },

  getPluginConfig(serverId: string, plugin: string): Promise<{ data: { content: string } }> {
    return httpClient.get(`/api/admin/servers/${serverId}/config/${plugin}`)
  },

  savePluginConfig(serverId: string, plugin: string, content: string): Promise<unknown> {
    return httpClient.patch(`/api/admin/servers/${serverId}/config/${plugin}`, { content })
  },
}

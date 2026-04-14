import { useEffect, useState } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import './Admin.css'

interface Server {
  id: string
  name: string
  service: string
  status: 'online' | 'offline'
  players_connected: number
  uptime: string
}

export function AdminServers() {
  const { accessToken } = useSessionStore()
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rconCommand, setRconCommand] = useState('')
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [rconOutput, setRconOutput] = useState('')

  const fetchServers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/servers', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to load servers')

      const data = await response.json()
      setServers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchServers()
      const interval = setInterval(fetchServers, 30000) // Poll every 30s
      return () => clearInterval(interval)
    }
  }, [accessToken])

  const handleServerControl = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch(`/api/admin/servers/${serverId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error(`Failed to ${action} server`)

      fetchServers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleRconExecute = async () => {
    if (!selectedServer || !rconCommand) return

    try {
      const response = await fetch(`/api/admin/servers/${selectedServer}/rcon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: rconCommand }),
      })

      if (!response.ok) throw new Error('Command not allowed')

      const data = await response.json()
      setRconOutput(data.data.output)
      setRconCommand('')
    } catch (err) {
      setRconOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading) return <div className="loading">Loading servers...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="admin-page">
      <h1>Server Management</h1>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Players</th>
            <th>Uptime</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => (
            <tr key={server.id}>
              <td>{server.name}</td>
              <td>
                <span className={`status-badge status-${server.status}`}>
                  {server.status}
                </span>
              </td>
              <td>{server.players_connected}</td>
              <td>{server.uptime}</td>
              <td className="actions">
                <button
                  onClick={() => handleServerControl(server.id, 'start')}
                  className="btn btn-sm btn-success"
                >
                  Start
                </button>
                <button
                  onClick={() => handleServerControl(server.id, 'stop')}
                  className="btn btn-sm btn-danger"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleServerControl(server.id, 'restart')}
                  className="btn btn-sm btn-secondary"
                >
                  Restart
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rcon-console">
        <h2>RCON Console</h2>
        <div className="console-select">
          <select
            value={selectedServer || ''}
            onChange={(e) => {
              setSelectedServer(e.target.value)
              setRconOutput('')
            }}
            className="select-input"
          >
            <option value="">Select a server...</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
        </div>

        {selectedServer && (
          <>
            <div className="console-output">{rconOutput}</div>
            <div className="console-input">
              <input
                type="text"
                placeholder="Enter command..."
                value={rconCommand}
                onChange={(e) => setRconCommand(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRconExecute()}
                className="input-field"
              />
              <button onClick={handleRconExecute} className="btn btn-primary">
                Execute
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

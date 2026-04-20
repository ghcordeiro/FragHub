import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import './Admin.css'

interface Server {
  id: string
  name: string
  service: string
  status: 'online' | 'offline'
  players_connected: number
  uptime: string
}

interface RconOutput {
  command: string
  output: string
  ts: string
}

const CS_MAPS = [
  'de_dust2', 'de_mirage', 'de_inferno', 'de_nuke',
  'de_overpass', 'de_vertigo', 'de_ancient', 'de_anubis',
]

const QUICK_COMMANDS: { label: string; cmd: string; variant?: string }[][] = [
  [
    { label: 'Status', cmd: 'status' },
    { label: 'Reiniciar Partida', cmd: 'mp_restartgame 1', variant: 'secondary' },
    { label: 'Cheats OFF', cmd: 'sv_cheats 0', variant: 'danger' },
    { label: 'Cheats ON', cmd: 'sv_cheats 1', variant: 'danger' },
  ],
  [
    { label: '30 Rounds', cmd: 'mp_maxrounds 30' },
    { label: '16 Rounds', cmd: 'mp_maxrounds 16' },
    { label: 'Freeze 15s', cmd: 'mp_freezetime 15' },
    { label: 'Freeze 3s', cmd: 'mp_freezetime 3' },
    { label: 'Buy 20s', cmd: 'mp_buytime 20' },
    { label: 'Buy 45s', cmd: 'mp_buytime 45' },
  ],
  [
    { label: 'Modo Competitivo', cmd: 'exec gamemode_competitive.cfg', variant: 'success' },
    { label: 'Modo Casual', cmd: 'exec gamemode_casual.cfg' },
  ],
]

export function AdminServers() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [rconHistory, setRconHistory] = useState<RconOutput[]>([])
  const [freeCommand, setFreeCommand] = useState('')
  const [rconLoading, setRconLoading] = useState(false)
  const [selectedMap, setSelectedMap] = useState(CS_MAPS[0])
  const [sayMessage, setSayMessage] = useState('')

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminService.getServers()
      setServers(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchServers()
    const interval = setInterval(() => void fetchServers(), 30000)
    return () => clearInterval(interval)
  }, [fetchServers])

  const handleServerControl = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await adminService.controlServer(serverId, action)
      void fetchServers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`)
    }
  }

  const sendCommand = async (command: string) => {
    if (!selectedServer || !command.trim() || rconLoading) return
    setRconLoading(true)
    const ts = new Date().toLocaleTimeString('pt-BR')
    try {
      const res = await adminService.sendRcon(selectedServer, command.trim())
      setRconHistory((h) => [{ command, output: res.data.output ?? '(ok)', ts }, ...h].slice(0, 50))
    } catch (err: unknown) {
      setRconHistory((h) =>
        [{ command, output: `Erro: ${err instanceof Error ? err.message : 'Unknown error'}`, ts }, ...h].slice(0, 50)
      )
    } finally {
      setRconLoading(false)
    }
  }

  const handleFreeCommand = () => {
    void sendCommand(freeCommand)
    setFreeCommand('')
  }

  if (loading) return <div className="loading">Carregando servidores…</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="admin-page">
      <h1>Server Management</h1>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th>Jogadores</th>
            <th>Uptime</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => (
            <tr
              key={server.id}
              style={{ background: selectedServer === server.id ? 'var(--surface-container-high)' : undefined, cursor: 'pointer' }}
              onClick={() => { setSelectedServer(server.id); setRconHistory([]) }}
            >
              <td><strong>{server.name}</strong></td>
              <td>
                <span className={`status-badge status-${server.status}`}>{server.status}</span>
              </td>
              <td>{server.players_connected}</td>
              <td>{server.uptime}</td>
              <td className="actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleServerControl(server.id, 'start')} className="btn btn-sm btn-success">Start</button>
                <button onClick={() => handleServerControl(server.id, 'stop')} className="btn btn-sm btn-danger">Stop</button>
                <button onClick={() => handleServerControl(server.id, 'restart')} className="btn btn-sm btn-secondary">Restart</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedServer && (
        <div className="rcon-console">
          <h2 style={{ marginTop: 0 }}>
            RCON — {servers.find((s) => s.id === selectedServer)?.name ?? selectedServer}
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Match &amp; Status</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {QUICK_COMMANDS[0].map(({ label, cmd, variant }) => (
                <button key={cmd} className={`btn btn-sm btn-${variant ?? 'primary'}`} disabled={rconLoading} onClick={() => void sendCommand(cmd)} title={cmd}>
                  {label}
                </button>
              ))}
            </div>

            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Configurações de Round</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {QUICK_COMMANDS[1].map(({ label, cmd }) => (
                <button key={cmd} className="btn btn-sm btn-secondary" disabled={rconLoading} onClick={() => void sendCommand(cmd)} title={cmd}>
                  {label}
                </button>
              ))}
            </div>

            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Modo de Jogo</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {QUICK_COMMANDS[2].map(({ label, cmd, variant }) => (
                <button key={cmd} className={`btn btn-sm btn-${variant ?? 'secondary'}`} disabled={rconLoading} onClick={() => void sendCommand(cmd)} title={cmd}>
                  {label}
                </button>
              ))}
            </div>

            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Trocar Mapa</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              <select className="select-input" value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
                {CS_MAPS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="btn btn-sm btn-danger" disabled={rconLoading} onClick={() => void sendCommand(`changelevel ${selectedMap}`)}>
                Trocar Mapa
              </button>
            </div>

            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Anúncio no Servidor</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Mensagem para todos os jogadores…"
                value={sayMessage}
                style={{ flex: 1 }}
                onChange={(e) => setSayMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sayMessage.trim()) {
                    void sendCommand(`say ${sayMessage.trim()}`)
                    setSayMessage('')
                  }
                }}
              />
              <button
                className="btn btn-sm btn-primary"
                disabled={rconLoading || !sayMessage.trim()}
                onClick={() => { void sendCommand(`say ${sayMessage.trim()}`); setSayMessage('') }}
              >
                Enviar
              </button>
            </div>
          </div>

          {rconHistory.length > 0 && (
            <div className="console-output" style={{ height: '180px', marginBottom: '1rem' }}>
              {rconHistory.map((entry, i) => (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#888', fontSize: '0.75rem' }}>[{entry.ts}]</span>{' '}
                  <span style={{ color: '#4fc3f7' }}>{entry.command}</span>
                  {'\n'}{entry.output}
                </div>
              ))}
            </div>
          )}

          <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#34495e' }}>Console Livre</p>
          <div className="console-input">
            <input
              type="text"
              className="input-field"
              placeholder="Comando RCON…"
              value={freeCommand}
              onChange={(e) => setFreeCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFreeCommand() }}
            />
            <button className="btn btn-primary" disabled={rconLoading || !freeCommand.trim()} onClick={handleFreeCommand}>
              {rconLoading ? '…' : 'Executar'}
            </button>
          </div>
        </div>
      )}

      {!selectedServer && servers.length > 0 && (
        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '1rem' }}>
          Clique em um servidor para abrir o painel RCON.
        </p>
      )}
    </div>
  )
}

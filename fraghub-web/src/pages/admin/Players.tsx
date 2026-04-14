import { useEffect, useState } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import './Admin.css'

interface Player {
  id: number
  email: string
  display_name: string
  role: string
  banned_at: string | null
  created_at: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
}

export function AdminPlayers() {
  const { accessToken } = useSessionStore()
  const [players, setPlayers] = useState<Player[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)

  const fetchPlayers = async (p: number = 1) => {
    try {
      setLoading(true)
      const url = new URL('/api/admin/players', window.location.origin)
      url.searchParams.set('page', p.toString())
      url.searchParams.set('limit', '20')
      if (search) url.searchParams.set('search', search)

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!response.ok) throw new Error('Failed to load players')

      const data = await response.json()
      setPlayers(data.data)
      setPagination(data.pagination)
      setPage(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchPlayers(1)
    }
  }, [accessToken, search])

  const handleBan = async () => {
    if (!selectedPlayer || !banReason) return

    try {
      const response = await fetch('/api/admin/players/ban', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: selectedPlayer.id,
          reason: banReason,
          duration_days: null,
        }),
      })

      if (!response.ok) throw new Error('Failed to ban player')

      setShowBanModal(false)
      setBanReason('')
      setSelectedPlayer(null)
      fetchPlayers(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleUnban = async (player_id: number) => {
    try {
      const response = await fetch('/api/admin/players/unban', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player_id }),
      })

      if (!response.ok) throw new Error('Failed to unban player')

      fetchPlayers(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading && players.length === 0) return <div className="loading">Loading players...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="admin-page">
      <h1>Player Management</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>{player.email}</td>
              <td>{player.display_name}</td>
              <td>{player.role}</td>
              <td>{player.banned_at ? 'Banned' : 'Active'}</td>
              <td className="actions">
                {player.banned_at ? (
                  <button
                    onClick={() => handleUnban(player.id)}
                    className="btn btn-secondary"
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPlayer(player)
                      setShowBanModal(true)
                    }}
                    className="btn btn-danger"
                  >
                    Ban
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="pagination">
          {pagination.page > 1 && (
            <button onClick={() => fetchPlayers(pagination.page - 1)}>Previous</button>
          )}
          <span>
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          {pagination.page < Math.ceil(pagination.total / pagination.limit) && (
            <button onClick={() => fetchPlayers(pagination.page + 1)}>Next</button>
          )}
        </div>
      )}

      {showBanModal && selectedPlayer && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Ban Player</h2>
            <p>Player: {selectedPlayer.display_name}</p>
            <textarea
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-actions">
              <button onClick={handleBan} className="btn btn-danger">
                Ban Player
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false)
                  setSelectedPlayer(null)
                  setBanReason('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

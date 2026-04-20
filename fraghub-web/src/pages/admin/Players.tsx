import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
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
  const [players, setPlayers] = useState<Player[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)

  const fetchPlayers = useCallback(async (p: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getPlayers({ page: p, limit: 20, search: search || undefined })
      setPlayers(data.data)
      setPagination(data.pagination)
      setPage(p)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void fetchPlayers(1)
  }, [fetchPlayers])

  const handleBan = async () => {
    if (!selectedPlayer || !banReason.trim()) return
    try {
      await adminService.banPlayer(selectedPlayer.id, banReason)
      setShowBanModal(false)
      setBanReason('')
      setSelectedPlayer(null)
      void fetchPlayers(page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ban player')
    }
  }

  const handleUnban = async (playerId: number) => {
    try {
      await adminService.unbanPlayer(playerId)
      void fetchPlayers(page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unban player')
    }
  }

  if (loading && players.length === 0) return <div className="loading">Loading players...</div>
  if (error) return <div className="error">{error}</div>

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

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
                  <button onClick={() => handleUnban(player.id)} className="btn btn-secondary">
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelectedPlayer(player); setShowBanModal(true) }}
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
          {page > 1 && (
            <button onClick={() => fetchPlayers(page - 1)}>Previous</button>
          )}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => fetchPlayers(page + 1)}>Next</button>
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
                onClick={() => { setShowBanModal(false); setSelectedPlayer(null); setBanReason('') }}
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

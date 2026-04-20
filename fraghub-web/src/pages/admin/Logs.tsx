import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/adminService'
import './Admin.css'

interface AuditLog {
  id: number
  admin_id: number
  action_type: string
  target_type?: string
  target_id?: number
  details: Record<string, unknown>
  ip_address?: string
  created_at: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
}

const ACTION_TYPES = [
  'ban_player', 'unban_player', 'edit_player', 'create_player', 'change_role',
  'rcon_command', 'server_start', 'server_stop', 'server_restart',
  'plugin_config_read', 'plugin_config_write',
]

export function AdminLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [actionType, setActionType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const fetchLogs = useCallback(async (p: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getLogs({ page: p, limit: 25, actionType: actionType || undefined })
      setLogs(data.data)
      setPagination(data.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [actionType])

  useEffect(() => {
    void fetchLogs(1)
  }, [fetchLogs])

  if (loading && logs.length === 0) return <div className="loading">Loading logs...</div>
  if (error) return <div className="error">{error}</div>

  const page = pagination?.page ?? 1
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="admin-page">
      <h1>Audit Logs</h1>

      <div className="filter-box">
        <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="select-input">
          <option value="">All Actions</option>
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Target</th>
            <th>Admin IP</th>
            <th>Timestamp</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} onClick={() => setSelectedLog(log)} className="clickable-row">
              <td>{log.action_type}</td>
              <td>{log.target_type} {log.target_id ? `#${log.target_id}` : ''}</td>
              <td>{log.ip_address || '-'}</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td><button className="btn btn-sm btn-secondary">View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="pagination">
          {page > 1 && <button onClick={() => fetchLogs(page - 1)}>Previous</button>}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages && <button onClick={() => fetchLogs(page + 1)}>Next</button>}
        </div>
      )}

      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Audit Log Details</h2>
            <div className="log-details">
              <p><strong>Action:</strong> {selectedLog.action_type}</p>
              <p><strong>Target:</strong> {selectedLog.target_type} #{selectedLog.target_id}</p>
              <p><strong>Admin ID:</strong> {selectedLog.admin_id}</p>
              <p><strong>IP Address:</strong> {selectedLog.ip_address || 'Unknown'}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedLog.created_at).toLocaleString()}</p>
              <p><strong>Details:</strong></p>
              <pre className="details-pre">{JSON.stringify(selectedLog.details, null, 2)}</pre>
            </div>
            <button onClick={() => setSelectedLog(null)} className="btn btn-secondary">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

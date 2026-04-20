import { useEffect, useState } from 'react'
import { adminService, type DashboardMetrics } from '@/services/adminService'
import './Admin.css'

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminService
      .getDashboard()
      .then((res) => setMetrics(res.data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
      )
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading dashboard...</div>
  if (error) return <div className="error">{error}</div>
  if (!metrics) return <div className="error">No metrics available</div>

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics.total_players}</div>
          <div className="metric-label">Total Players</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.matches_today}</div>
          <div className="metric-label">Matches Today</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.servers_online}</div>
          <div className="metric-label">Servers Online</div>
        </div>
      </div>

      <div className="recent-logs-section">
        <h2>Recent Audit Logs</h2>
        {metrics.recent_logs.length === 0 ? (
          <p>No recent logs</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action_type}</td>
                  <td>{log.target_type} #{log.target_id || '-'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

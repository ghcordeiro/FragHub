import { Link, Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'
import { useSession } from '@/hooks/useSession'
import './AdminLayout.css'

export function AdminLayout() {
  const { user, isLoading } = useSession()
  const { clearSession } = useSessionStore()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <p className="admin-user">Admin: {user.email}</p>
        </div>

        <nav className="admin-nav">
          <Link to="/admin/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link to="/admin/players" className="nav-link">
            Players
          </Link>
          <Link to="/admin/servers" className="nav-link">
            Servers
          </Link>
          <Link to="/admin/logs" className="nav-link">
            Audit Logs
          </Link>
          <Link to="/admin/config" className="nav-link">
            Plugin Config
          </Link>
        </nav>

        <button
          className="logout-btn"
          onClick={() => {
            clearSession()
            window.location.href = '/'
          }}
        >
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

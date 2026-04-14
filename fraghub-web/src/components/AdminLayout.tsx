import { Link, Outlet } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'
import './AdminLayout.css'

export function AdminLayout() {
  const { user, clearSession } = useSessionStore()

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-unauthorized">
        <h2>Access Denied</h2>
        <p>You must be an admin to access this area.</p>
        <Link to="/">Back to Home</Link>
      </div>
    )
  }

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

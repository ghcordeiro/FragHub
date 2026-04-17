import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import styles from './NavBar.module.css'

const NAV_LINKS = [
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/matches', label: 'Matches' },
  { to: '/servers', label: 'Servers' },
  { to: '/news', label: 'News' },
]

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useSession()

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          FRAGHUB
        </Link>

        <div className={styles.links}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.link}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className={styles.actions}>
          {isAuthenticated && user ? (
            <>
              <span className={styles.userInfo}>{user.name}</span>
              <button className={styles.logoutBtn} onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnGhost}>
                Login
              </Link>
              <Link to="/register" className={styles.btnPrimary}>
                Join Queue
              </Link>
            </>
          )}
        </div>

        <button
          className={styles.hamburger}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      <div className={`${styles.mobileMenu}${menuOpen ? ` ${styles.open}` : ''}`}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.mobileLink}${isActive ? ` ${styles.active}` : ''}`
            }
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </NavLink>
        ))}
        {isAuthenticated && user ? (
          <button
            className={styles.mobileLink}
            onClick={() => { logout(); setMenuOpen(false) }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link to="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              Login
            </Link>
            <Link to="/register" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              Join Queue
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

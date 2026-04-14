import { useNavigate } from 'react-router-dom'
import { useSession } from '@/hooks'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useSession()

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>FragHub Portal</h1>
      <p>Welcome to the FragHub community leaderboard and ranking system.</p>

      {isAuthenticated ? (
        <div>
          <p>Welcome back, {user?.name}!</p>
          <button onClick={() => navigate('/players/me')} style={{ marginRight: '1rem' }}>
            View Your Profile
          </button>
          <button onClick={() => navigate('/leaderboard')}>View Leaderboard</button>
        </div>
      ) : (
        <div>
          <p>Please log in to get started.</p>
          <button onClick={() => navigate('/login')} style={{ marginRight: '1rem' }}>
            Login
          </button>
          <button onClick={() => navigate('/register')}>Register</button>
        </div>
      )}
    </div>
  )
}

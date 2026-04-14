import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSessionStore } from '@/store'
import type { AuthResponse } from '@/types/auth'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setSession } = useSessionStore()

  useEffect(() => {
    const token = searchParams.get('token')

    if (token) {
      try {
        // Decode the token to extract user data if it's a JWT
        // For now, we'll just store it and make a refresh call to validate
        // Remove token from URL for security
        window.history.replaceState({}, document.title, window.location.pathname)

        // Call refresh to get user data
        fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
          .then((res) => {
            if (res.ok) return res.json()
            throw new Error('Failed to refresh')
          })
          .then((data: AuthResponse) => {
            setSession(data.accessToken, data.user)
            navigate('/')
          })
          .catch(() => {
            navigate('/login')
          })
      } catch {
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  }, [searchParams, navigate, setSession])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Processando login...</p>
    </div>
  )
}

import { useEffect } from 'react'
import { useSessionStore } from '@/store'
import { httpClient } from '@/services/http'
import type { AuthResponse } from '@/types/auth'

export function useSession() {
  const { accessToken, user, isLoading, setSession, clearSession, setLoading } =
    useSessionStore()
  const isAuthenticated = !!accessToken && !!user

  useEffect(() => {
    // Attempt to restore session from refresh token cookie on mount
    const restoreSession = async () => {
      if (accessToken) {
        // Already have a session
        return
      }

      setLoading(true)
      try {
        const response = await httpClient.post<AuthResponse>('/auth/refresh', undefined, { credentials: 'include' })
        setSession(response.accessToken, response.user)
      } catch {
        // Refresh failed, user is not authenticated
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [accessToken, clearSession, setLoading, setSession])

  const logout = () => {
    clearSession()
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  }
}

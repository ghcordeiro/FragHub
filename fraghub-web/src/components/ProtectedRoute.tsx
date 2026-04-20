import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/store'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectPath?: string
}

export function ProtectedRoute({ children, redirectPath = '/login' }: ProtectedRouteProps) {
  const { accessToken, user, isLoading } = useSessionStore()
  const isAuthenticated = !!accessToken && !!user
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated) {
    const redirect = `${redirectPath}?redirect=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}

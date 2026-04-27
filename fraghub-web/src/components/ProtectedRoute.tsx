import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { LoadingSpinner } from './ui'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectPath?: string
}

export function ProtectedRoute({ children, redirectPath = '/login' }: ProtectedRouteProps) {
  const { accessToken, user, isLoading } = useSessionStore()
  const isAuthenticated = !!accessToken && !!user
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const redirect = `${redirectPath}?redirect=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}

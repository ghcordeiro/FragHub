import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectPath?: string
}

export function ProtectedRoute({ children, redirectPath = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated } = useSession()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirect = `${redirectPath}?redirect=${encodeURIComponent(location.pathname)}`
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}

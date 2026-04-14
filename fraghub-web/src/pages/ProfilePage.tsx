import { ProtectedRoute } from '@/components/ProtectedRoute'

export function ProfilePage() {
  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem' }}>
        <h1>Seu Perfil</h1>
        <p>Profile page coming soon...</p>
      </div>
    </ProtectedRoute>
  )
}

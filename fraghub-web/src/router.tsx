import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    lazy: () => import('@/pages/LoginPage').then((m) => ({ Component: m.LoginPage })),
  },
  {
    path: '/register',
    lazy: () => import('@/pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })),
  },
  {
    path: '/auth/callback',
    lazy: () =>
      import('@/pages/AuthCallbackPage').then((m) => ({ Component: m.AuthCallbackPage })),
  },
  {
    path: '/players/me',
    lazy: () => import('@/pages/ProfilePage').then((m) => ({ Component: m.ProfilePage })),
  },
  {
    path: '/players/:id',
    lazy: () =>
      import('@/pages/PublicProfilePage').then((m) => ({ Component: m.PublicProfilePage })),
  },
  {
    path: '/leaderboard',
    lazy: () => import('@/pages/LeaderboardPage').then((m) => ({ Component: m.LeaderboardPage })),
  },
])

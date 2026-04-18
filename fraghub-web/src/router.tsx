import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AdminLayout } from '@/components/AdminLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.HomePage })),
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
      {
        path: '/matches',
        lazy: () => import('@/pages/MatchesPage').then((m) => ({ Component: m.MatchesPage })),
      },
      {
        path: '/matches/:id',
        lazy: () => import('@/pages/MatchDetailPage').then((m) => ({ Component: m.MatchDetailPage })),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'dashboard',
        lazy: () => import('@/pages/admin/Dashboard').then((m) => ({ Component: m.AdminDashboard })),
      },
      {
        path: 'players',
        lazy: () => import('@/pages/admin/Players').then((m) => ({ Component: m.AdminPlayers })),
      },
      {
        path: 'servers',
        lazy: () => import('@/pages/admin/Servers').then((m) => ({ Component: m.AdminServers })),
      },
      {
        path: 'logs',
        lazy: () => import('@/pages/admin/Logs').then((m) => ({ Component: m.AdminLogs })),
      },
      {
        path: 'config',
        lazy: () => import('@/pages/admin/PluginConfig').then((m) => ({ Component: m.AdminPluginConfig })),
      },
    ],
  },
])

import { create } from 'zustand'
import type { User } from '@/types/auth'

interface SessionState {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  setSession: (token: string, user: User) => void
  clearSession: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  isLoading: true, // true until first refresh attempt resolves
  error: null,
  setSession: (token, user) => set({ accessToken: token, user, error: null }),
  clearSession: () => set({ accessToken: null, user: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

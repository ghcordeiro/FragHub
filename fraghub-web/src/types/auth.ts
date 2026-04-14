export interface User {
  id: string
  email: string
  name: string
  role: string
  steamId?: string | null
  avatarUrl?: string | null
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface ApiError {
  error: string
  statusCode: number
}

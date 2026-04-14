import { useSessionStore } from '@/store'
import type { ApiError } from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  credentials?: RequestCredentials
}

class HttpClient {
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    alreadyRefreshed = false
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const store = useSessionStore.getState()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    if (store.accessToken) {
      headers.Authorization = `Bearer ${store.accessToken}`
    }

    const body =
      options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : undefined

    const config: RequestInit = {
      method: options.method,
      headers,
      credentials: options.credentials,
      body,
    }

    try {
      const response = await fetch(url, config)

      if (response.status === 401 && !alreadyRefreshed) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          })

          if (refreshResponse.ok) {
            const refreshData = (await refreshResponse.json()) as { accessToken: string }
            const latest = useSessionStore.getState()
            const user = latest.user
            if (!user) {
              latest.clearSession()
            } else {
              latest.setSession(refreshData.accessToken, user)
              return this.request<T>(endpoint, options, true)
            }
          } else {
            useSessionStore.getState().clearSession()
          }
        } catch {
          useSessionStore.getState().clearSession()
        }

        let error: ApiError = {
          error: 'Unauthorized',
          statusCode: 401,
        }
        try {
          const clone = response.clone()
          const data = await clone.json()
          error = data as ApiError
        } catch {
          // body not JSON
        }
        throw error
      }

      if (!response.ok) {
        let error: ApiError = {
          error: response.statusText || 'Unknown error',
          statusCode: response.status,
        }

        try {
          const data = await response.json()
          error = data as ApiError
        } catch {
          // Failed to parse error response
        }

        throw error
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof Object && 'statusCode' in error) {
        throw error as ApiError
      }

      throw {
        error: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
      } as ApiError
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const httpClient = new HttpClient()

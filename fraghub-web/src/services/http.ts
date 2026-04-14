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
  private retryCount: Record<string, number> = {}

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const store = useSessionStore.getState()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    // Add JWT token if available
    if (store.accessToken) {
      headers.Authorization = `Bearer ${store.accessToken}`
    }

    const body = options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : undefined

    const config: RequestInit = {
      method: options.method,
      headers,
      credentials: options.credentials,
      body,
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 - attempt token refresh
      if (response.status === 401) {
        const retryKey = `${options.method || 'GET'}-${endpoint}`
        if ((this.retryCount[retryKey] || 0) === 0) {
          this.retryCount[retryKey] = (this.retryCount[retryKey] || 0) + 1

          try {
            // Attempt to refresh token
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
            })

            if (refreshResponse.ok) {
              const refreshData = (await refreshResponse.json()) as { accessToken: string }
              store.setSession(refreshData.accessToken, store.user!)

              // Retry the original request
              return this.request<T>(endpoint, options)
            }
          } catch {
            // Refresh failed, clear session
            store.clearSession()
          }

          this.retryCount[retryKey] = 0
        }
      }

      // Handle non-2xx responses
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

      // Parse and return response
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

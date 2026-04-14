import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { httpClient } from '@/services/http'
import type { AuthResponse } from '@/types/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useSessionStore((state) => state.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await httpClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      })

      setSession(response.accessToken, response.user)
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect)
    } catch (err: unknown) {
      const error = err as { statusCode?: number; error?: string }
      if (error.statusCode === 401) {
        setError('Email ou senha incorretos')
      } else {
        setError('Não foi possível conectar ao servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', padding: '2rem' }}>
      <h1>Entrar</h1>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            marginBottom: '1rem',
          }}
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <a
        href={`${import.meta.env.VITE_API_URL}/auth/google`}
        style={{
          display: 'block',
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          textAlign: 'center',
          textDecoration: 'none',
          marginBottom: '1rem',
          fontSize: '1rem',
        }}
      >
        Entrar com Google
      </a>

      <p style={{ textAlign: 'center' }}>
        Não tem uma conta?{' '}
        <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>
          Criar conta
        </Link>
      </p>
    </div>
  )
}

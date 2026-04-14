import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { httpClient } from '@/services/http'
import type { AuthResponse } from '@/types/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (formData.name.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Email inválido'
    }

    if (formData.password.length < 8) {
      errors.password = 'Senha deve ter pelo menos 8 caracteres'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Senhas não correspondem'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await httpClient.post<AuthResponse>('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })

      setSession(response.accessToken, response.user)
      navigate('/')
    } catch (err: unknown) {
      const error = err as { statusCode?: number; error?: string }
      if (error.statusCode === 409) {
        setError('Este email já está em uso')
      } else {
        setError('Não foi possível criar a conta')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', padding: '2rem' }}>
      <h1>Criar Conta</h1>

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
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Nome
          </label>
          <input
            id="name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {validationErrors.name && (
            <div style={{ color: '#c62828', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.name}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {validationErrors.email && (
            <div style={{ color: '#c62828', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Senha
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            value={formData.password}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {validationErrors.password && (
            <div style={{ color: '#c62828', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.password}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Confirmar Senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          {validationErrors.confirmPassword && (
            <div style={{ color: '#c62828', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {validationErrors.confirmPassword}
            </div>
          )}
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
          {isLoading ? 'Criando conta...' : 'Criar Conta'}
        </button>
      </form>

      <p style={{ textAlign: 'center' }}>
        Já tem uma conta?{' '}
        <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          Entrar
        </Link>
      </p>
    </div>
  )
}

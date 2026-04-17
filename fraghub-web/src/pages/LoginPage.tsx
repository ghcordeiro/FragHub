import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { httpClient } from '@/services/http'
import type { AuthResponse } from '@/types/auth'
import { InputField, ErrorAlert, Button } from '@/components/ui'
import styles from './LoginPage.module.css'

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
      const response = await httpClient.post<AuthResponse>('/auth/login', { email, password })
      setSession(response.accessToken, response.user)
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect)
    } catch (err: unknown) {
      const apiErr = err as { statusCode?: number }
      setError(apiErr.statusCode === 401 ? 'Email ou senha incorretos' : 'Não foi possível conectar ao servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar</h1>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <InputField
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            id="password"
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className={styles.submitBtn}>
            {isLoading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className={styles.divider}>ou</div>

        <a
          href={`${import.meta.env.VITE_API_URL}/auth/google`}
          className={styles.googleBtn}
        >
          Entrar com Google
        </a>

        <p className={styles.footer}>
          Não tem uma conta?{' '}
          <Link to="/register" className={styles.link}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}

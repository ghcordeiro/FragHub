import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { httpClient } from '@/services/http'
import type { AuthResponse } from '@/types/auth'
import { InputField, ErrorAlert, Button } from '@/components/ui'
import styles from './RegisterPage.module.css'

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

    if (formData.name.length < 2) errors.name = 'Nome deve ter pelo menos 2 caracteres'

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email inválido'

    if (formData.password.length < 8) errors.password = 'Senha deve ter pelo menos 8 caracteres'

    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = 'Senhas não correspondem'

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

    if (!validateForm()) return

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
      const apiErr = err as { statusCode?: number }
      setError(apiErr.statusCode === 409 ? 'Este email já está em uso' : 'Não foi possível criar a conta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Criar Conta</h1>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <InputField
            id="name"
            label="Nome"
            type="text"
            name="name"
            required
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            error={validationErrors.name}
          />
          <InputField
            id="email"
            label="Email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={validationErrors.email}
          />
          <InputField
            id="password"
            label="Senha"
            type="password"
            name="password"
            required
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={validationErrors.password}
          />
          <InputField
            id="confirmPassword"
            label="Confirmar Senha"
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={validationErrors.confirmPassword}
          />
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className={styles.submitBtn}>
            {isLoading ? 'Criando conta…' : 'Criar Conta'}
          </Button>
        </form>

        <p className={styles.footer}>
          Já tem uma conta?{' '}
          <Link to="/login" className={styles.link}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

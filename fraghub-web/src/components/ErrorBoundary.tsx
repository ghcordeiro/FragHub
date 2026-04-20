import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--background, #111319)',
          color: 'var(--on-surface, #e2e2eb)',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠</div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Algo deu errado</h2>
          <p style={{ margin: 0, color: 'var(--on-surface-variant, #c2c6d6)', fontSize: '0.9rem' }}>
            {this.state.error?.message ?? 'Erro inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--primary-container, #4d8eff)',
              color: 'var(--on-primary, #002e6a)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Recarregar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

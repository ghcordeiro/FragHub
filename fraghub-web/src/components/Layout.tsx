import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useSession } from '@/hooks/useSession'
import { queueService } from '@/services/queueService'
import styles from './Layout.module.css'

const POLL_INTERVAL_MS = 3000

function MatchReadyBanner({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate()
  return (
    <div className={styles.matchBanner} role="alert">
      <span className={styles.matchBannerIcon}>▶</span>
      <span className={styles.matchBannerText}>Partida encontrada!</span>
      <button
        className={styles.matchBannerBtn}
        onClick={() => { navigate('/queue'); onDismiss() }}
      >
        Ver detalhes
      </button>
      <button className={styles.matchBannerClose} onClick={onDismiss} aria-label="Dispensar">
        ✕
      </button>
    </div>
  )
}

export function Layout() {
  const { isAuthenticated } = useSession()
  const [matchReady, setMatchReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setMatchReady(false)
      setDismissed(false)
      return
    }

    const poll = async () => {
      try {
        const status = await queueService.getStatus()
        const ready = status.state === 'IN_PROGRESS'
        setMatchReady(ready)
        if (!ready) setDismissed(false)
      } catch {
        // non-blocking
      }
    }

    poll()
    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isAuthenticated])

  const showBanner = matchReady && !dismissed

  return (
    <>
      <NavBar />
      {showBanner && <MatchReadyBanner onDismiss={() => setDismissed(true)} />}
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}

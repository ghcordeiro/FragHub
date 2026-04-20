import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LevelBadge } from '@/components/LevelBadge'
import { ErrorAlert } from '@/components/ui'
import { useSessionStore } from '@/store'
import { queueService, type QueueStatus } from '@/services/queueService'
import styles from './QueuePage.module.css'

const POLL_INTERVAL_MS = 3000

const MAP_IMAGES: Record<string, string> = {
  de_dust2: 'Dust II',
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_nuke: 'Nuke',
  de_overpass: 'Overpass',
  de_ancient: 'Ancient',
  de_anubis: 'Anubis',
}

function mapLabel(mapName: string): string {
  return MAP_IMAGES[mapName] ?? mapName
}

function avgEloLabel(elo?: number) {
  return elo != null ? `ELO médio: ${elo}` : ''
}

function QueueContent() {
  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)

  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await queueService.getStatus()
      setStatus(s)
      setError(null)
    } catch {
      setError('Não foi possível obter status da fila')
    }
  }, [])

  useEffect(() => {
    document.title = 'Fila — FragHub'
    fetchStatus()

    pollingRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [fetchStatus])

  const handleJoin = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await queueService.join()
      await fetchStatus()
    } catch (e: any) {
      if (e?.code === 'NO_STEAM_LINKED') {
        setError('Você precisa vincular sua conta Steam para jogar. Acesse seu perfil.')
      } else {
        setError(e?.error ?? 'Erro ao entrar na fila')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    setActionLoading(true)
    try {
      await queueService.leave()
      await fetchStatus()
    } catch {
      setError('Erro ao sair da fila')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBanMap = async (map: string) => {
    if (!status?.queueSessionId) return
    setActionLoading(true)
    try {
      await queueService.banMap(status.queueSessionId, map)
      await fetchStatus()
    } catch (e: any) {
      setError(e?.error ?? 'Erro ao banir mapa')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyConnect = () => {
    if (!status?.connectString) return
    navigator.clipboard.writeText(status.connectString).then(() => {
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasSteam = !!user?.steamId

  if (!status) {
    return <div className={styles.centered}>Carregando…</div>
  }

  const state = status.state

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Fila 5v5</h1>

      {error && (
        <ErrorAlert>
          {error}{' '}
          {error.includes('Steam') && (
            <button className={styles.linkBtn} onClick={() => navigate('/players/me')}>
              Ir para perfil
            </button>
          )}
        </ErrorAlert>
      )}

      {/* NOT_IN_QUEUE */}
      {state === 'NOT_IN_QUEUE' && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>⚔</div>
          <h2 className={styles.cardTitle}>Encontrar Partida</h2>
          <p className={styles.cardDesc}>
            Entre na fila 5v5. Quando 10 jogadores estiverem prontos, os times são balanceados por
            ELO e o map veto começa.
          </p>
          {!hasSteam && (
            <p className={styles.steamWarning}>
              Você precisa vincular sua conta Steam antes de jogar.{' '}
              <button className={styles.linkBtn} onClick={() => navigate('/players/me')}>
                Vincular Steam
              </button>
            </p>
          )}
          <button
            className={styles.btnPrimary}
            onClick={handleJoin}
            disabled={actionLoading || !hasSteam}
          >
            {actionLoading ? 'Entrando…' : 'Entrar na Fila'}
          </button>
        </div>
      )}

      {/* WAITING_PLAYERS */}
      {state === 'WAITING_PLAYERS' && (
        <div className={styles.card}>
          <div className={styles.spinner} aria-label="Procurando partida" />
          <h2 className={styles.cardTitle}>Procurando Partida…</h2>
          <div className={styles.queueBar}>
            <div
              className={styles.queueBarFill}
              style={{ width: `${((status.totalInQueue ?? 0) / 10) * 100}%` }}
            />
          </div>
          <p className={styles.queueCount}>
            {status.totalInQueue ?? 0} / 10 jogadores
          </p>
          <p className={styles.queuePos}>Sua posição: {status.position ?? '—'}</p>
          <button
            className={styles.btnGhost}
            onClick={handleLeave}
            disabled={actionLoading}
          >
            {actionLoading ? 'Saindo…' : 'Sair da Fila'}
          </button>
        </div>
      )}

      {/* PLAYERS_FOUND */}
      {state === 'PLAYERS_FOUND' && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>✓</div>
          <h2 className={styles.cardTitle}>Jogadores Encontrados!</h2>
          <p className={styles.cardDesc}>Iniciando seleção de mapa…</p>
        </div>
      )}

      {/* MAP_VOTE */}
      {state === 'MAP_VOTE' && (
        <div className={styles.vetoContainer}>
          <div className={styles.teamsRow}>
            <TeamCard
              label="Time A"
              players={status.teamA ?? []}
              avgElo={status.avgEloA}
              highlight={status.vetoState?.currentTurn === 'TEAM_A'}
            />
            <div className={styles.vetoDivider}>VS</div>
            <TeamCard
              label="Time B"
              players={status.teamB ?? []}
              avgElo={status.avgEloB}
              highlight={status.vetoState?.currentTurn === 'TEAM_B'}
            />
          </div>

          {status.vetoState && (
            <>
              <div className={styles.vetoStatus}>
                {status.vetoState.isCaptain && status.vetoState.currentTurn !== 'TEAM_A' &&
                  status.vetoState.currentTurn !== 'TEAM_B' ? null :
                  status.vetoState.isCaptain ? (
                    <span className={styles.vetoYourTurn}>Sua vez — ban um mapa</span>
                  ) : (
                    <span className={styles.vetoWaiting}>
                      Aguardando {status.vetoState.currentTurn === 'TEAM_A' ? 'Time A' : 'Time B'} banir…
                    </span>
                  )}
              </div>

              <div className={styles.mapPool}>
                {status.vetoState.remainingMaps.map((m) => (
                  <button
                    key={m}
                    className={styles.mapBtn}
                    onClick={() => handleBanMap(m)}
                    disabled={!status.vetoState?.isCaptain || actionLoading}
                  >
                    <span className={styles.mapName}>{mapLabel(m)}</span>
                    {status.vetoState?.isCaptain && (
                      <span className={styles.mapBanLabel}>banir</span>
                    )}
                  </button>
                ))}
              </div>

              {status.vetoState.banHistory.length > 0 && (
                <div className={styles.banHistory}>
                  <span className={styles.banHistoryLabel}>Bans:</span>
                  {status.vetoState.banHistory.map((b, i) => (
                    <span key={i} className={styles.banEntry}>
                      <span className={styles.banTeam}>{b.banningTeam === 'TEAM_A' ? 'A' : 'B'}</span>
                      {' banniu '}
                      <strong>{mapLabel(b.map)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* IN_PROGRESS */}
      {state === 'IN_PROGRESS' && (
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ color: 'var(--primary)' }}>▶</div>
          <h2 className={styles.cardTitle}>Partida Encontrada!</h2>
          <p className={styles.cardDesc}>
            Mapa: <strong>{mapLabel(status.mapSelected ?? '')}</strong>
          </p>
          {status.connectString && (
            <div className={styles.connectBox}>
              <code className={styles.connectString}>{status.connectString}</code>
              <button className={styles.copyBtn} onClick={handleCopyConnect}>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
          <p className={styles.connectHint}>
            Cole no console do CS2/CS:GO para entrar no servidor.
          </p>
        </div>
      )}

      {/* FINISHED */}
      {state === 'FINISHED' && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>✓</div>
          <h2 className={styles.cardTitle}>Partida Finalizada</h2>
          <p className={styles.cardDesc}>Pronto para jogar novamente?</p>
          <button className={styles.btnPrimary} onClick={handleJoin} disabled={actionLoading || !hasSteam}>
            {actionLoading ? 'Entrando…' : 'Nova Partida'}
          </button>
        </div>
      )}
    </div>
  )
}

function TeamCard({
  label,
  players,
  avgElo,
  highlight,
}: {
  label: string
  players: Array<{ id: string; displayName: string; elo: number; level: number }>
  avgElo?: number
  highlight: boolean
}) {
  return (
    <div className={`${styles.teamCard}${highlight ? ` ${styles.teamCardActive}` : ''}`}>
      <div className={styles.teamLabel}>{label}</div>
      {avgElo != null && <div className={styles.teamAvgElo}>{avgEloLabel(avgElo)}</div>}
      <ul className={styles.playerList}>
        {players.map((p) => (
          <li key={p.id} className={styles.playerRow}>
            <LevelBadge level={p.level} />
            <span className={styles.playerName}>{p.displayName}</span>
            <span className={styles.playerElo}>{p.elo}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function QueuePage() {
  return (
    <ProtectedRoute>
      <QueueContent />
    </ProtectedRoute>
  )
}

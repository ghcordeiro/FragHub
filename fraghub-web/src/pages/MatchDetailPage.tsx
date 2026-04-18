import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchService } from '@/services/matchService'
import type { MatchDetail, MatchPlayer } from '@/types/match'
import styles from './MatchDetailPage.module.css'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}min ${s}s`
}

function TeamTable({ players }: { players: MatchPlayer[] }) {
  const sorted = [...players].sort((a, b) => b.kills - a.kills)
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Jogador</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>K/D</th>
          <th>HS</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => (
          <tr key={p.steamId}>
            <td className={styles.playerName}>{p.displayName ?? p.steamId}</td>
            <td>{p.kills}</td>
            <td>{p.deaths}</td>
            <td>{p.assists}</td>
            <td>{p.kdr.toFixed(2)}</td>
            <td>{p.headshots}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setIsLoading(true)
        const data = await matchService.getMatch(id)
        setMatch(data)
        document.title = `${data.map} — FragHub`
      } catch {
        setError('Partida não encontrada')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) return <div className={styles.loading}>Carregando…</div>
  if (error || !match) return <div className={styles.error}>{error ?? 'Erro ao carregar partida'}</div>

  const team1Players = match.players.filter((p) => p.team === 'team1')
  const team2Players = match.players.filter((p) => p.team === 'team2')

  const t1Won = match.winner === 'team1'
  const t2Won = match.winner === 'team2'

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/matches')}>
        ← Partidas
      </button>

      <div className={styles.header}>
        <h1 className={styles.mapTitle}>{match.map}</h1>
        <div className={styles.meta}>
          <span>{new Date(match.playedAt).toLocaleString('pt-BR')}</span>
          <span>{match.game.toUpperCase()}</span>
          <span>{formatDuration(match.durationSeconds)}</span>
          <span>{match.players.length} jogadores</span>
        </div>
      </div>

      <div className={styles.scoreboard}>
        <div>
          <div className={styles.teamLabel}>Time 1</div>
          <div className={`${styles.teamScore} ${t1Won ? styles.winner : styles.loser}`}>
            {match.team1Score}
          </div>
        </div>
        <div className={styles.vs}>VS</div>
        <div>
          <div className={styles.teamLabel}>Time 2</div>
          <div className={`${styles.teamScore} ${t2Won ? styles.winner : styles.loser}`}>
            {match.team2Score}
          </div>
        </div>
      </div>

      <div className={styles.teamsGrid}>
        <div className={styles.teamSection}>
          <h2>Time 1 {t1Won && '🏆'}</h2>
          <TeamTable players={team1Players} />
        </div>
        <div className={styles.teamSection}>
          <h2>Time 2 {t2Won && '🏆'}</h2>
          <TeamTable players={team2Players} />
        </div>
      </div>
    </div>
  )
}

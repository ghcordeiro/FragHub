import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { matchService } from '@/services/matchService'
import { ErrorAlert } from '@/components/ui'
import type { Match } from '@/types/match'
import styles from './MatchesPage.module.css'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatScore(m: Match): string {
  return `${m.team1Score} — ${m.team2Score}`
}

export function MatchesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const game = searchParams.get('game') || 'all'

  const [matches, setMatches] = useState<Match[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Partidas — FragHub'
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const result = await matchService.getMatches(page, 20, game)
        setMatches(result.matches)
        setTotalPages(result.totalPages)
        setError(null)
      } catch {
        setError('Não foi possível carregar as partidas')
        setMatches([])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [page, game])

  const setPage = (p: number) => setSearchParams({ page: String(p), game })
  const setGame = (g: string) => setSearchParams({ page: '1', game: g })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Partidas</h1>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Jogo</label>
          <select className={styles.select} value={game} onChange={(e) => setGame(e.target.value)}>
            <option value="all">Todos</option>
            <option value="cs2">CS2</option>
            <option value="csgo">CS:GO</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {isLoading ? (
        <p className={styles.loading}>Carregando partidas…</p>
      ) : matches.length === 0 ? (
        <p className={styles.empty}>Nenhuma partida encontrada.</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Jogo</th>
                  <th>Mapa</th>
                  <th>Placar</th>
                  <th>Duração</th>
                  <th>Jogadores</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} onClick={() => navigate(`/matches/${m.id}`)}>
                    <td>{new Date(m.playedAt).toLocaleDateString('pt-BR')}</td>
                    <td><span className={styles.gameBadge}>{m.game}</span></td>
                    <td>{m.map}</td>
                    <td className={styles.score}>{formatScore(m)}</td>
                    <td>{formatDuration(m.durationSeconds)}</td>
                    <td>{m.playerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(page - 1)}>
              ‹ Anterior
            </button>
            <span className={styles.pageLabel}>Página {page} de {totalPages}</span>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Próxima ›
            </button>
          </div>
        </>
      )}
    </div>
  )
}

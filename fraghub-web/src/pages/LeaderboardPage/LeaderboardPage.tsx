import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RankingTable } from '@/components/RankingTable'
import { ErrorAlert, LoadingSpinner } from '@/components/ui'
import { leaderboardService } from '@/services/leaderboardService'
import { useSession } from '@/hooks'
import type { Player } from '@/types/player'
import { PodiumSection } from './PodiumSection'
import styles from './LeaderboardPage.module.css'

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useSession()

  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const PAGE_SIZE = 25
  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    document.title = 'Ranking — FragHub'
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setIsLoading(true)
        const response = await leaderboardService.getLeaderboard(currentPage, PAGE_SIZE)
        if (!cancelled) {
          setPlayers(response.players)
          setTotal(response.total)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível carregar o ranking')
          setPlayers([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentPage])

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.pageTag}>Global</p>
        <h1 className={styles.title}>Ranking</h1>
        {total > 0 && (
          <p className={styles.meta}>{total.toLocaleString('pt-BR')} jogadores classificados</p>
        )}
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {isLoading ? (
        <div className={styles.loadingState}>
          <LoadingSpinner size="lg" />
          <p className={styles.loadingText}>Carregando ranking…</p>
        </div>
      ) : players.length > 0 ? (
        <>
          {currentPage === 1 && <PodiumSection players={players} />}
          <RankingTable
            players={players}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            currentUserId={user?.id || null}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Nenhum jogador registrado ainda.</p>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RankingTable } from '@/components/RankingTable'
import { ErrorAlert } from '@/components/ui'
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
  const gameFilter = searchParams.get('game') || 'all'
  const periodFilter = searchParams.get('period') || 'all'

  const PAGE_SIZE = 25
  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true)
        const response = await leaderboardService.getLeaderboard(currentPage, PAGE_SIZE, gameFilter, periodFilter)
        setPlayers(response.players)
        setTotal(response.total)
        setError(null)
      } catch (err) {
        setError('Não foi possível carregar o leaderboard')
        console.error(err)
        setPlayers([])
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [currentPage, gameFilter, periodFilter])

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page), game: gameFilter, period: periodFilter })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ game: e.target.value, period: periodFilter, page: '1' })
  }

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ game: gameFilter, period: e.target.value, page: '1' })
  }

  const handleClearFilters = () => {
    setSearchParams({ page: '1' })
  }

  useEffect(() => {
    document.title = 'Ranking — FragHub'
    const metas: { property: string; content: string }[] = [
      { property: 'og:title', content: 'Ranking FragHub — CS2/CS:GO' },
      { property: 'og:description', content: 'Veja o ranking de jogadores da comunidade FragHub' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'website' },
    ]

    metas.forEach(({ property, content }) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.content = content
    })
  }, [])

  const hasActiveFilters = gameFilter !== 'all' || periodFilter !== 'all'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Ranking da Comunidade</h1>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="game-filter" className={styles.filterLabel}>
            Jogo
          </label>
          <select
            id="game-filter"
            className={styles.select}
            value={gameFilter}
            onChange={handleGameChange}
          >
            <option value="all">Todos</option>
            <option value="cs2">CS2</option>
            <option value="csgo">CS:GO</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="period-filter" className={styles.filterLabel}>
            Período
          </label>
          <select
            id="period-filter"
            className={styles.select}
            value={periodFilter}
            onChange={handlePeriodChange}
          >
            <option value="all">Todo o tempo</option>
            <option value="month">Último mês</option>
            <option value="week">Última semana</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className={styles.filterActions}>
            <button className={styles.clearBtn} onClick={handleClearFilters}>
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className={styles.loading}>Carregando leaderboard…</p>
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
          <p className={styles.emptyText}>Nenhum jogador encontrado para os filtros selecionados.</p>
          {hasActiveFilters && (
            <button className={styles.clearBtn} onClick={handleClearFilters}>
              Limpar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

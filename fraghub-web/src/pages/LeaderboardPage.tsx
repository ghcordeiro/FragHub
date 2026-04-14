import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RankingTable } from '@/components/RankingTable'
import { leaderboardService } from '@/services/leaderboardService'
import { useSession } from '@/hooks'
import type { Player } from '@/types/player'

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

  // Set OpenGraph meta tags for sharing
  useEffect(() => {
    const metaTags = [
      { property: 'og:title', content: 'Ranking FragHub — CS2/CS:GO' },
      { property: 'og:description', content: 'Veja o ranking de jogadores da comunidade FragHub' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'website' },
    ]

    metaTags.forEach(({ property, content }) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.content = content
    })
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Ranking da Comunidade</h1>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <label htmlFor="game-filter" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Jogo
          </label>
          <select
            id="game-filter"
            value={gameFilter}
            onChange={handleGameChange}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">Todos</option>
            <option value="cs2">CS2</option>
            <option value="csgo">CS:GO</option>
          </select>
        </div>

        <div>
          <label htmlFor="period-filter" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Período
          </label>
          <select
            id="period-filter"
            value={periodFilter}
            onChange={handlePeriodChange}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">Todo o tempo</option>
            <option value="month">Último mês</option>
            <option value="week">Última semana</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {(gameFilter !== 'all' || periodFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Carregando leaderboard...</p>
        </div>
      ) : players.length > 0 ? (
        <RankingTable
          players={players}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          currentUserId={user?.id || null}
          onPageChange={handlePageChange}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Nenhum jogador encontrado para os filtros selecionados.</p>
          <button
            onClick={handleClearFilters}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  )
}

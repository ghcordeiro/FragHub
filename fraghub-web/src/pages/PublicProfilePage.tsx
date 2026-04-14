import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LevelBadge } from '@/components/LevelBadge'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { playerService } from '@/services/playerService'
import type { Player, MatchRecord } from '@/types/player'

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        const playerData = await playerService.getPlayer(id)
        setPlayer(playerData)

        // Load matches
        const matchesData = await playerService.getPlayerMatches(id, currentPage)
        setMatches(matchesData)
      } catch (err) {
        setError('Jogador não encontrado')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [id, currentPage])

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Carregando perfil...</p>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1>Jogador não encontrado</h1>
        <p>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Voltar ao Início
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '2rem' }}>
        <PlayerAvatar avatarUrl={player.avatarUrl} name={player.name} size={96} />

        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>{player.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <LevelBadge level={player.level} size="lg" />
            <div>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Nível {player.level}</strong>
              </p>
              <p style={{ margin: '0.25rem 0', color: '#666' }}>ELO: {player.elo}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Estatísticas</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>Total de Partidas</p>
            <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {player.totalMatches}
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>Vitórias</p>
            <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {player.wins}
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>Taxa de Vitória</p>
            <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {player.winPercentage.toFixed(1)}%
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>K/D Ratio</p>
            <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {player.kdRatio.toFixed(2)}
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>HS %</p>
            <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {player.hsPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2>Histórico de Partidas</h2>
        {matches.length > 0 ? (
          <>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '1rem',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Mapa</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Resultado</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Kills</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Deaths</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>K/D</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>HS %</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{new Date(match.date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{match.map}</td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color:
                          match.result === 'win'
                            ? '#4caf50'
                            : match.result === 'loss'
                              ? '#f44336'
                              : '#ff9800',
                        fontWeight: 'bold',
                      }}
                    >
                      {match.result === 'win' ? 'Vitória' : match.result === 'loss' ? 'Derrota' : 'Empate'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{match.kills}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{match.deaths}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{match.kdRatio.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {match.hsPercentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Anterior
              </button>
              <span style={{ padding: '0.5rem 1rem' }}>Página {currentPage}</span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={matches.length < 10}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: matches.length < 10 ? 'not-allowed' : 'pointer',
                  opacity: matches.length < 10 ? 0.5 : 1,
                }}
              >
                Próxima
              </button>
            </div>
          </>
        ) : (
          <p>Nenhuma partida encontrada.</p>
        )}
      </div>
    </div>
  )
}

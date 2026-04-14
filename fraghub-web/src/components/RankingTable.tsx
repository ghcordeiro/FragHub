import { Link } from 'react-router-dom'
import { LevelBadge } from './LevelBadge'
import type { Player } from '@/types/player'

interface RankingTableProps {
  players: Player[]
  currentPage: number
  totalPages: number
  pageSize: number
  currentUserId: string | null
  onPageChange: (page: number) => void
}

export function RankingTable({
  players,
  currentPage,
  totalPages,
  pageSize,
  currentUserId,
  onPageChange,
}: RankingTableProps) {
  const startPosition = (currentPage - 1) * pageSize + 1

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Posição</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Jogador</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Nível</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>ELO</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', display: 'none', minWidth: '600px' }}>
                Partidas
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'right', display: 'none', minWidth: '600px' }}>
                Win %
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isCurrentUser = currentUserId && player.id === currentUserId
              const position = startPosition + index

              return (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: isCurrentUser ? '#fff3cd' : 'transparent',
                    fontWeight: isCurrentUser ? 'bold' : 'normal',
                  }}
                >
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>#{position}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <Link
                      to={`/players/${player.id}`}
                      style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                      {player.name}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <LevelBadge level={player.level} size="sm" />
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{player.elo}</td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      display: window.innerWidth < 768 ? 'none' : 'table-cell',
                    }}
                  >
                    {player.totalMatches}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      display: window.innerWidth < 768 ? 'none' : 'table-cell',
                    }}
                  >
                    {player.winPercentage.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: currentPage === page ? '#0056b3' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {page}
            </button>
          )
        })}

        {totalPages > 5 && <span style={{ padding: '0.5rem 0.75rem' }}>...</span>}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          Próxima
        </button>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
        Página {currentPage} de {totalPages}
      </div>
    </div>
  )
}

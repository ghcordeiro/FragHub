import { Link } from 'react-router-dom'
import { LevelBadge } from './LevelBadge'
import type { Player } from '@/types/player'
import styles from './RankingTable.module.css'

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

  const pageNumbers = (() => {
    const total = totalPages
    const current = currentPage
    const delta = 2
    const range: number[] = []

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i)
    }

    const pages: (number | 'ellipsis')[] = [1]
    if (range[0] > 2) pages.push('ellipsis')
    pages.push(...range)
    if (range[range.length - 1] < total - 1) pages.push('ellipsis')
    if (total > 1) pages.push(total)

    return pages
  })()

  return (
    <div>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.center}>Pos</th>
              <th>Jogador</th>
              <th className={styles.center}>Nível</th>
              <th className={styles.right}>ELO</th>
              <th className={`${styles.right} ${styles.hideOnMobile}`}>W/L</th>
              <th className={`${styles.right} ${styles.hideOnMobile}`}>Win %</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isCurrentUser = Boolean(currentUserId && player.id === currentUserId)
              const position = startPosition + index

              return (
                <tr
                  key={player.id}
                  className={`${styles.row}${isCurrentUser ? ` ${styles.currentUser}` : ''}`}
                >
                  <td className={`${styles.center} ${styles.rank}`}>#{position}</td>
                  <td>
                    <Link to={`/players/${player.id}`} className={styles.playerLink}>
                      {player.name}
                    </Link>
                  </td>
                  <td className={styles.center}>
                    <LevelBadge level={player.level} size="sm" />
                  </td>
                  <td className={styles.right}>{player.elo}</td>
                  <td className={`${styles.right} ${styles.hideOnMobile}`}>
                    {player.totalMatches}
                  </td>
                  <td className={`${styles.right} ${styles.hideOnMobile}`}>
                    {player.winPercentage.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          ‹
        </button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn}${currentPage === p ? ` ${styles.active}` : ''}`}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p}`}
              aria-current={currentPage === p ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.pageBtn}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Próxima página"
        >
          ›
        </button>
      </div>

      <p className={styles.pageInfo}>
        Página {currentPage} de {totalPages}
      </p>
    </div>
  )
}

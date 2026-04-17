import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LevelBadge } from '@/components/LevelBadge'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Button } from '@/components/ui'
import { playerService } from '@/services/playerService'
import type { Player, MatchRecord } from '@/types/player'
import styles from './PublicProfilePage.module.css'

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

  const resultClass = (result: MatchRecord['result']) => {
    if (result === 'win') return styles.resultWin
    if (result === 'loss') return styles.resultLoss
    return styles.resultDraw
  }

  const resultLabel = (result: MatchRecord['result']) => {
    if (result === 'win') return 'Vitória'
    if (result === 'loss') return 'Derrota'
    return 'Empate'
  }

  if (isLoading) {
    return <p className={styles.loading}>Carregando perfil…</p>
  }

  if (error || !player) {
    return (
      <div className={styles.errorState}>
        <h1 className={styles.errorTitle}>Jogador não encontrado</h1>
        <p className={styles.errorText}>{error}</p>
        <Button variant="ghost" size="md" onClick={() => navigate('/')}>
          Voltar ao Início
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PlayerAvatar avatarUrl={player.avatarUrl} name={player.name} size={96} />
        <div className={styles.headerInfo}>
          <h1 className={styles.playerName}>{player.name}</h1>
          <div className={styles.levelRow}>
            <LevelBadge level={player.level} size="lg" />
            <div className={styles.levelInfo}>
              <p className={styles.levelLabel}>Nível {player.level}</p>
              <p className={styles.eloLabel}>ELO: {player.elo}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Estatísticas</h2>
        <div className={styles.statsGrid}>
          {[
            { label: 'Partidas', value: player.totalMatches },
            { label: 'Vitórias', value: player.wins },
            { label: 'Win %', value: `${player.winPercentage.toFixed(1)}%` },
            { label: 'K/D Ratio', value: player.kdRatio.toFixed(2) },
            { label: 'HS %', value: `${player.hsPercentage.toFixed(1)}%` },
          ].map(({ label, value }) => (
            <div key={label} className={styles.statCard}>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.matchSection}>
        <h2 className={styles.sectionTitle}>Histórico de Partidas</h2>
        {matches.length > 0 ? (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.matchTable}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Mapa</th>
                    <th>Resultado</th>
                    <th className={styles.right}>Kills</th>
                    <th className={styles.right}>Deaths</th>
                    <th className={styles.right}>K/D</th>
                    <th className={styles.right}>HS %</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id}>
                      <td>{new Date(match.date).toLocaleDateString()}</td>
                      <td>{match.map}</td>
                      <td className={resultClass(match.result)}>{resultLabel(match.result)}</td>
                      <td className={styles.right}>{match.kills}</td>
                      <td className={styles.right}>{match.deaths}</td>
                      <td className={styles.right}>{match.kdRatio.toFixed(2)}</td>
                      <td className={styles.right}>{match.hsPercentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              <span className={styles.pageLabel}>Página {currentPage}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={matches.length < 10}
              >
                ›
              </button>
            </div>
          </>
        ) : (
          <p className={styles.steamId}>Nenhuma partida encontrada.</p>
        )}
      </div>
    </div>
  )
}

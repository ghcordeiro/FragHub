import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LevelBadge } from '@/components/LevelBadge'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Button } from '@/components/ui'
import { ErrorAlert } from '@/components/ui'
import { playerService } from '@/services/playerService'
import { adminService } from '@/services/adminService'
import { useSessionStore } from '@/store'
import type { Player, MatchRecord } from '@/types/player'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accessToken = useSessionStore((s) => s.accessToken)
  const currentUser = useSessionStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'

  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [matchesTotalPages, setMatchesTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isMatchesLoading, setIsMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Load player profile and stats once
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const playerData = await playerService.getCurrentPlayer()
        setEditedName(playerData.name)
        const statsData = await playerService.getPlayerStats(playerData.id)
        setPlayer({
          ...playerData,
          totalMatches: statsData.matchesPlayed,
          wins: statsData.wins,
          winPercentage:
            statsData.matchesPlayed > 0
              ? Math.round((statsData.wins / statsData.matchesPlayed) * 1000) / 10
              : 0,
          kdRatio: statsData.kdr,
          hsPercentage: statsData.hsPercent,
        })
      } catch (err) {
        setError('Não foi possível carregar o perfil')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [searchParams])

  // Load matches separately, re-runs on page change
  useEffect(() => {
    if (!player) return
    const loadMatches = async () => {
      try {
        setIsMatchesLoading(true)
        const result = await playerService.getPlayerMatches(player.id, currentPage)
        setMatches(result.data)
        setMatchesTotalPages(result.totalPages)
      } catch (err) {
        console.error(err)
      } finally {
        setIsMatchesLoading(false)
      }
    }
    void loadMatches()
  }, [player?.id, currentPage])

  const handleNameEdit = async () => {
    if (!player || editedName.length < 2 || editedName.length > 32) {
      setError('Nome deve ter entre 2 e 32 caracteres')
      return
    }
    setIsSavingName(true)
    try {
      const updated = await playerService.updatePlayerName(editedName)
      setPlayer(updated)
      setIsEditingName(false)
      setError(null)
    } catch (err) {
      setError('Não foi possível atualizar o nome')
      console.error(err)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleSteamUnlink = async () => {
    if (!player) return
    if (!window.confirm('Remover vínculo Steam deste jogador?')) return
    try {
      await adminService.unlinkSteam(player.id)
      setPlayer({ ...player, steamId: null })
    } catch {
      setError('Não foi possível remover o vínculo Steam')
    }
  }

  const handleSteamLink = () => {
    const base = import.meta.env.VITE_API_URL || ''
    const url = new URL('/auth/steam/link', base || window.location.origin)
    if (accessToken) url.searchParams.set('token', accessToken)
    window.location.href = url.toString()
  }

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

  return (
    <ProtectedRoute>
      <div className={styles.page}>
        {searchParams.get('steam_linked') === '1' && (
          <div className={styles.successAlert}>Conta Steam vinculada com sucesso!</div>
        )}

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {isLoading ? (
          <p className={styles.loading}>Carregando perfil…</p>
        ) : player ? (
          <>
            <div className={styles.header}>
              <PlayerAvatar avatarUrl={player.avatarUrl} name={player.name} size={96} />
              <div className={styles.headerInfo}>
                <div className={styles.nameRow}>
                  {isEditingName ? (
                    <>
                      <input
                        className={styles.editInput}
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                      />
                      <div className={styles.editActions}>
                        <Button variant="primary" size="sm" isLoading={isSavingName} onClick={handleNameEdit}>
                          Salvar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setIsEditingName(false); setEditedName(player.name) }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h1 className={styles.playerName}>{player.name}</h1>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                        Editar Nome
                      </Button>
                    </>
                  )}
                </div>
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

            <div className={styles.steamSection}>
              {player.steamId ? (
                <>
                  <h3 className={styles.steamTitle}>Steam Vinculada</h3>
                  <p className={styles.steamId}>ID: {player.steamId}</p>
                  {isAdmin && (
                    <Button variant="danger" size="sm" onClick={handleSteamUnlink}>
                      Remover vínculo Steam
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h3 className={styles.steamTitle}>Vincular Conta Steam</h3>
                  <p className={styles.steamId}>Vincule sua conta Steam para ver mais estatísticas.</p>
                  <Button variant="ghost" size="sm" onClick={handleSteamLink}>
                    Vincular Steam
                  </Button>
                </>
              )}
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
                      disabled={currentPage === 1 || isMatchesLoading}
                    >
                      ‹
                    </button>
                    <span className={styles.pageLabel}>Página {currentPage}</span>
                    <button
                      className={styles.pageBtn}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= matchesTotalPages || isMatchesLoading}
                    >
                      ›
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.steamId}>Nenhuma partida encontrada.</p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.errorState}>
            <p className={styles.errorText}>Erro ao carregar o perfil.</p>
            <Button variant="ghost" size="md" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

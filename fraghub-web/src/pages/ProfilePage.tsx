import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LevelBadge } from '@/components/LevelBadge'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { playerService } from '@/services/playerService'
import { useSessionStore } from '@/store'
import type { Player, MatchRecord } from '@/types/player'

export function ProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accessToken = useSessionStore((s) => s.accessToken)
  const currentUser = useSessionStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const playerData = await playerService.getCurrentPlayer()
        setPlayer(playerData)
        setEditedName(playerData.name)

        // Load matches
        const matchesData = await playerService.getPlayerMatches(playerData.id, currentPage)
        setMatches(matchesData)
      } catch (err) {
        setError('Não foi possível carregar o perfil')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [currentPage, searchParams])

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
      await fetch(`${import.meta.env.VITE_API_URL}/admin/players/${player.id}/steam`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setPlayer({ ...player, steamId: null })
    } catch {
      setError('Não foi possível remover o vínculo Steam')
    }
  }

  const handleSteamLink = () => {
    const base = import.meta.env.VITE_API_URL
    if (!base) {
      console.error('VITE_API_URL is not defined')
      return
    }
    const url = new URL(`${base}/auth/steam/link`, window.location.origin)
    if (accessToken) url.searchParams.set('token', accessToken)
    window.location.href = url.toString()
  }

  return (
    <ProtectedRoute>
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        {searchParams.get('steam_linked') === '1' && (
          <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px' }}>
            Conta Steam vinculada com sucesso!
          </div>
        )}

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

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Carregando perfil...</p>
          </div>
        ) : player ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '2rem' }}>
              <PlayerAvatar avatarUrl={player.avatarUrl} name={player.name} size={96} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        style={{ padding: '0.5rem', fontSize: '1.25rem' }}
                      />
                      <button
                        onClick={handleNameEdit}
                        disabled={isSavingName}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isSavingName ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSavingName ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false)
                          setEditedName(player.name)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#999',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <h1 style={{ margin: 0 }}>{player.name}</h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Editar Nome
                      </button>
                    </>
                  )}
                </div>

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

            {player.steamId ? (
              isAdmin && (
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                  <h3 style={{ margin: '0.5rem 0' }}>Steam Vinculada</h3>
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>ID: {player.steamId}</p>
                  <button
                    onClick={handleSteamUnlink}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#c62828',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                    }}
                  >
                    Remover vínculo Steam
                  </button>
                </div>
              )
            ) : (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <h3 style={{ margin: '0.5rem 0' }}>Vincular Conta Steam</h3>
                <p style={{ margin: '0.5rem 0', color: '#666' }}>Vincule sua conta Steam para ver mais estatísticas.</p>
                <button
                  onClick={handleSteamLink}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#1b1a1a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                  }}
                >
                  Vincular Steam
                </button>
              </div>
            )}

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
                          <td style={{ padding: '0.75rem' }}>
                            {new Date(match.date).toLocaleDateString()}
                          </td>
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
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Erro ao carregar o perfil.</p>
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
        )}
      </div>
    </ProtectedRoute>
  )
}

import { useEffect, useState } from 'react'
import { liveService, type LiveMatch } from '@/services/liveService'
import styles from './LiveMatchBanner.module.css'

const POLL_INTERVAL_MS = 5000

function TeamPanel({ team }: { team: LiveMatch['team1'] }) {
  return (
    <div className={styles.team}>
      <div className={styles.teamHeader}>
        <span className={styles.teamName}>{team.name}</span>
      </div>
      <div className={styles.players}>
        <div className={styles.playerRow}>
          <span className={styles.statHeader}></span>
          <span className={styles.statHeader}>K</span>
          <span className={styles.statHeader}>D</span>
          <span className={styles.statHeader}>A</span>
        </div>
        {team.players.map((p) => (
          <div key={p.steamId} className={styles.playerRow}>
            <span className={styles.playerName}>{p.name ?? p.steamId}</span>
            <span className={styles.stat}>{p.kills}</span>
            <span className={styles.stat}>{p.deaths}</span>
            <span className={styles.stat}>{p.assists}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LiveMatchBanner() {
  const [match, setMatch] = useState<LiveMatch | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await liveService.get()
        if (!cancelled) setMatch(res.isLive ? res : null)
      } catch {
        // silencioso
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!match) return null

  return (
    <div className={styles.banner}>
      <div className={styles.header}>
        <span className={styles.dot} />
        <span className={styles.liveLabel}>Ao vivo</span>
        <span className={styles.mapLabel}>{match.mapName ?? `Map ${match.mapNumber + 1}`}</span>
        <span className={styles.roundLabel}>Round {match.round}</span>
      </div>

      <div className={styles.scoreboard}>
        <TeamPanel team={match.team1} />

        <div className={styles.centerScore}>
          {match.roundHistory.length > 0 && (
            <div className={styles.roundHistory}>
              {match.roundHistory.slice(-15).map((winner, i) => (
                <span
                  key={i}
                  className={`${styles.roundDot} ${winner === 'team1' ? styles.roundDotTeam1 : styles.roundDotTeam2}`}
                />
              ))}
            </div>
          )}

          <div className={styles.scoreRow}>
            <span className={styles.score}>{match.team1.score}</span>
            <span className={styles.scoreSep}>—</span>
            <span className={styles.score}>{match.team2.score}</span>
          </div>

          <div className={styles.lossBonusRow}>
            <span className={styles.lossBonus}>${match.team1.lossBonus.toLocaleString()}</span>
            <span className={styles.lossBonusLabel}>loss</span>
            <span className={styles.lossBonus}>${match.team2.lossBonus.toLocaleString()}</span>
          </div>
        </div>

        <TeamPanel team={match.team2} />
      </div>

      <div className={styles.lastUpdate}>
        Atualizado às {new Date(match.updatedAt).toLocaleTimeString('pt-BR')}
      </div>
    </div>
  )
}

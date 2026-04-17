import { LevelBadge } from '@/components/LevelBadge'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import type { Player } from '@/types/player'
import styles from './PodiumSection.module.css'

interface PodiumSectionProps {
  players: Player[]
}

function PodiumCard({ player, position }: { player: Player; position: number }) {
  const isFirst = position === 1
  const labels = ['', '🥇 #1', '🥈 #2', '🥉 #3']

  return (
    <div className={`${styles.card}${isFirst ? ` ${styles.first}` : ''}`}>
      <span className={`${styles.positionBadge}${isFirst ? ` ${styles.gold}` : ''}`}>
        {labels[position]}
      </span>
      <PlayerAvatar avatarUrl={player.avatarUrl} name={player.name} size={isFirst ? 72 : 56} />
      <p className={styles.name}>{player.name}</p>
      <LevelBadge level={player.level} size={isFirst ? 'md' : 'sm'} />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{player.elo}</span>
          <span className={styles.statLabel}>ELO</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{player.kdRatio.toFixed(2)}</span>
          <span className={styles.statLabel}>K/D</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{player.winPercentage.toFixed(0)}%</span>
          <span className={styles.statLabel}>Win</span>
        </div>
      </div>
    </div>
  )
}

export function PodiumSection({ players }: PodiumSectionProps) {
  if (players.length < 3) return null

  return (
    <div className={styles.podium}>
      <PodiumCard player={players[1]} position={2} />
      <PodiumCard player={players[0]} position={1} />
      <PodiumCard player={players[2]} position={3} />
    </div>
  )
}

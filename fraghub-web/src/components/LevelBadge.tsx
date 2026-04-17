import styles from './LevelBadge.module.css'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

function getTier(level: number): string {
  if (level <= 2) return 'tier-low'
  if (level <= 5) return 'tier-mid'
  if (level <= 8) return 'tier-high'
  return 'tier-top'
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const clamped = Math.max(1, Math.min(10, level))
  const tier = getTier(clamped)

  return (
    <div
      className={`${styles.badge} ${styles[size]} ${styles[tier]}`}
      aria-label={`Nível ${clamped}`}
    >
      {clamped}
    </div>
  )
}

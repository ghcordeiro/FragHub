import { useState } from 'react'
import styles from './PlayerAvatar.module.css'

interface PlayerAvatarProps {
  avatarUrl: string | null | undefined
  name: string
  size?: number
}

export function PlayerAvatar({ avatarUrl, name, size = 48 }: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const initial = name.charAt(0).toUpperCase() || '?'
  const fontSize = Math.round(size * 0.4)

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={styles.avatar}
        style={{ width: size, height: size }}
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <div
      className={styles.fallback}
      style={{ width: size, height: size, fontSize }}
      aria-label={`Avatar de ${name}`}
    >
      {initial}
    </div>
  )
}

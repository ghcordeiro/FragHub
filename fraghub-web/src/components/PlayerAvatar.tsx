import { useState } from 'react'

interface PlayerAvatarProps {
  avatarUrl: string | null | undefined
  name: string
  size?: number
}

export function PlayerAvatar({ avatarUrl, name, size = 48 }: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false)

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
        onError={() => setHasError(true)}
      />
    )
  }

  // Fallback: SVG circle with initials
  const initial = name.charAt(0).toUpperCase() || '?'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#e0e0e0',
        color: '#666',
        fontSize: `${size * 0.4}px`,
        fontWeight: 'bold',
        userSelect: 'none',
      }}
      aria-label={`Avatar de ${name}`}
    >
      {initial}
    </div>
  )
}

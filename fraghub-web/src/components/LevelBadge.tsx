interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  const colorMap: Record<number, string> = {
    1: '#808080', // Gray
    2: '#808080',
    3: '#43a047', // Green
    4: '#43a047',
    5: '#43a047',
    6: '#fdd835', // Yellow
    7: '#fdd835',
    8: '#fdd835',
    9: '#e53935', // Red
    10: '#e53935',
  }

  const diameter = sizeMap[size]
  const color = colorMap[Math.max(1, Math.min(10, level))] || '#808080'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        backgroundColor: color,
        color: 'white',
        fontSize: `${diameter * 0.5}px`,
        fontWeight: 'bold',
        userSelect: 'none',
      }}
      aria-label={`Nível ${level}`}
    >
      {level}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { httpClient } from '@/services/http'
import styles from './StatsRow.module.css'

interface LiveStats {
  players: string
  matches: string
  servers: string
}

async function fetchLiveStats(): Promise<LiveStats> {
  const [playersRes, matchesRes] = await Promise.all([
    httpClient.get<{ meta: { total: number } }>('/players?sort=elo_desc&page=1&limit=1').catch(() => null),
    httpClient.get<{ meta: { total: number } }>('/matches?page=1&limit=1').catch(() => null),
  ])

  const players = playersRes?.meta?.total ?? null
  const matches = matchesRes?.meta?.total ?? null

  return {
    players: players !== null ? players.toLocaleString('pt-BR') : '—',
    matches: matches !== null ? matches.toLocaleString('pt-BR') : '—',
    servers: '—',
  }
}

export function StatsRow() {
  const [stats, setStats] = useState<LiveStats>({ players: '...', matches: '...', servers: '—' })

  useEffect(() => {
    fetchLiveStats().then(setStats).catch(() => {
      setStats({ players: '—', matches: '—', servers: '—' })
    })
  }, [])

  const items = [
    { value: stats.players, label: 'Jogadores Registrados' },
    { value: stats.matches, label: 'Partidas Disputadas' },
    { value: stats.servers, label: 'Servidores Ativos' },
  ]

  return (
    <section className={styles.row}>
      <div className={styles.inner}>
        {items.map(({ value, label }, i) => (
          <div key={label} className={styles.stat} style={{ animationDelay: `${i * 80}ms` }}>
            <p className={styles.value}>{value}</p>
            <p className={styles.label}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

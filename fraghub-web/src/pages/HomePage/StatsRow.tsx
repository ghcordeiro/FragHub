import styles from './StatsRow.module.css'

const STATS = [
  { value: '1,247', label: 'Players Registered' },
  { value: '8,392', label: 'Matches Played' },
  { value: '24', label: 'Active Servers' },
]

export function StatsRow() {
  return (
    <section className={styles.row}>
      <div className={styles.inner}>
        {STATS.map(({ value, label }) => (
          <div key={label} className={styles.stat}>
            <p className={styles.value}>{value}</p>
            <p className={styles.label}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

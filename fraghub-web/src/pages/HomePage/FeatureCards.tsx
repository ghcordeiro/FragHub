import styles from './FeatureCards.module.css'

const CARDS = [
  {
    icon: '🏆',
    title: 'ELO System',
    desc: 'Glicko-2 based ranking with 10 skill levels',
  },
  {
    icon: '🎯',
    title: 'Matchmaking',
    desc: '5v5 balanced queue with map veto',
  },
  {
    icon: '🏷️',
    title: 'In-Game Tags',
    desc: 'Real-time CS2/CS:GO level tags via plugin',
  },
  {
    icon: '⚙️',
    title: 'Admin Panel',
    desc: 'Full server management and audit trail',
  },
]

export function FeatureCards() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Everything you need to compete</h2>
        <div className={styles.grid}>
          {CARDS.map(({ icon, title, desc }) => (
            <div key={title} className={styles.card}>
              <span className={styles.icon} aria-hidden="true">{icon}</span>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import styles from './HeroSection.module.css'

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.headline}>
          Compete. <span>Rank Up.</span> Dominate.
        </h1>
        <p className={styles.subtitle}>
          The all-in-one matchmaking hub for CS2/CS:GO community servers.
        </p>
        <div className={styles.ctas}>
          <Link to="/register" className={styles.ctaPrimary}>
            Get Started
          </Link>
          <Link to="/leaderboard" className={styles.ctaGhost}>
            View Leaderboard
          </Link>
        </div>
      </div>
    </section>
  )
}

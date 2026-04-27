import { Link } from 'react-router-dom'
import styles from './HeroSection.module.css'

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.inner}>
        <p className={styles.eyebrow}>CS2 / CS:GO · Servidores Comunitários</p>
        <h1 className={styles.headline}>
          Compita.<br />
          <span className={styles.accent}>Suba de nível.</span><br />
          Domine.
        </h1>
        <p className={styles.subtitle}>
          Matchmaking 5v5, ranking ELO e painel completo para
          seu servidor CS2/CS:GO.
        </p>
        <div className={styles.ctas}>
          <Link to="/register" className={styles.ctaPrimary}>
            Começar agora
          </Link>
          <Link to="/leaderboard" className={styles.ctaGhost}>
            Ver ranking
          </Link>
        </div>
      </div>
    </section>
  )
}

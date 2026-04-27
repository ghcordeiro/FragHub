import styles from './FeatureCards.module.css'

const CARDS = [
  {
    tag: '01',
    title: 'Sistema ELO',
    desc: 'Ranking Glicko-2 com 10 níveis de habilidade. Cada partida conta.',
  },
  {
    tag: '02',
    title: 'Matchmaking',
    desc: 'Fila 5v5 balanceada por ELO com veto de mapa integrado.',
  },
  {
    tag: '03',
    title: 'Tags In-Game',
    desc: 'Plugin CS2/CS:GO exibe seu nível em tempo real no servidor.',
  },
  {
    tag: '04',
    title: 'Painel Admin',
    desc: 'Gestão de jogadores, servidores RCON e trilha de auditoria.',
  },
]

export function FeatureCards() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.sectionTag}>Plataforma</p>
          <h2 className={styles.title}>Tudo para competir</h2>
        </header>
        <div className={styles.grid}>
          {CARDS.map(({ tag, title, desc }, i) => (
            <article
              key={tag}
              className={styles.card}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className={styles.tag}>{tag}</p>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardDesc}>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

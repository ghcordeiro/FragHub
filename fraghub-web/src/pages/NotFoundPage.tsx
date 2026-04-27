import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.subtitle}>Esta rota não existe.</p>
      <Link to="/" className={styles.btn}>Voltar ao início</Link>
    </div>
  )
}

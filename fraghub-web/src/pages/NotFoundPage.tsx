import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.subtitle}>This route doesn't exist yet.</p>
      <Link to="/">
        <Button variant="ghost" size="md">Back to Home</Button>
      </Link>
    </div>
  )
}

import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={styles.wrapper} aria-label="Loading" role="status">
      <div className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />
    </div>
  )
}

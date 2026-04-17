import type { ReactNode } from 'react'
import styles from './ErrorAlert.module.css'

interface ErrorAlertProps {
  children: ReactNode
}

export function ErrorAlert({ children }: ErrorAlertProps) {
  return (
    <div className={styles.alert} role="alert">
      {children}
    </div>
  )
}

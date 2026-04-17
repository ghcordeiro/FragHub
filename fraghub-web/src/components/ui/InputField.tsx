import type { InputHTMLAttributes } from 'react'
import styles from './InputField.module.css'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
}

export function InputField({ label, id, error, className, ...props }: InputFieldProps) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={[styles.input, error ? styles.hasError : '', className].filter(Boolean).join(' ')}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

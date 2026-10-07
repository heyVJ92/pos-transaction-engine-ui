import { useState, type FormEvent } from 'react'
import styles from './LoginScreen.module.css'
import { THEMES, type Theme } from '../theme'
import { useAuth } from '../auth/useAuth'
import { ApiClientError, extractFieldErrors } from '../api/client'
import type { Role } from '../auth/token'

interface LoginScreenProps {
  onLoginSuccess?: (role: Role) => void
}

function usePreferredTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const theme = usePreferredTheme()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const role = await login(email, password)
      onLoginSuccess?.(role)
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors(extractFieldErrors(err.details))
        } else {
          // Covers INVALID_CREDENTIALS and anything else — same envelope, same treatment.
          setFormError(err.message)
        }
      } else {
        setFormError('Something went wrong. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page} style={THEMES[theme]}>
      <div className={styles.root} data-screen-label="Login">
        <header className={styles.header}>
          <div className={styles.statusGroup}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>engine operational</span>
          </div>
          <div className={styles.buildInfo}>store 04 · v1.4.0</div>
        </header>

        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.mark}>
              <div className={styles.markBarAccent} />
              <div className={styles.markBar} />
              <div className={styles.markBarSmall} />
            </div>

            <h1 className={styles.heading}>Sign in to Tender</h1>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {formError && <div className={styles.formError}>{formError}</div>}

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Work email</span>
                <input
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  placeholder="you@store04.tender.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Password</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
              </label>

              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? 'Opening session…' : 'Open session'}
              </button>
            </form>

            <p className={styles.footer}>Trouble signing in? Your store admin can reset access.</p>
          </div>
        </main>
      </div>
    </div>
  )
}

import styles from './ThemeToggle.module.css'
import type { Theme } from '../theme'

interface ThemeToggleProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

export default function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Dark mode' : 'Light mode'}
    >
      <span className={`${styles.thumb} ${isDark ? styles.thumbDark : ''}`}>
        {isDark ? (
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4" y1="12" x2="2" y2="12" />
            <line x1="22" y1="12" x2="20" y2="12" />
            <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
            <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" />
            <line x1="19.07" y1="19.07" x2="17.66" y2="17.66" />
            <line x1="6.34" y1="6.34" x2="4.93" y2="4.93" />
          </svg>
        )}
      </span>
    </button>
  )
}

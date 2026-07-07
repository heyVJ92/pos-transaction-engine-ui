import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import styles from './CashierLayout.module.css'
import { THEMES, type Theme } from '../theme'

export default function CashierLayout() {
  const [theme, setTheme] = useState<Theme>('light')

  return (
    <div className={styles.root} style={THEMES[theme]} data-screen-label="Cashier">
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.mark}>
            <div className={styles.markBarAccent} />
            <div className={styles.markBar} />
            <div className={styles.markBarSmall} />
          </div>
          <div className={styles.brandText}>
            <div className={styles.wordmark}>Tender</div>
            <div className={styles.storeLabel}>store 04</div>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.roleBadge}>
            <div className={styles.roleAvatar}>C</div>
            <span className={styles.roleLabel}>cashier</span>
          </div>
          <Link to="/" className={styles.exitLink}>exit</Link>
          <div className={styles.themeToggle}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`${styles.themeTab} ${theme === 'light' ? styles.themeTabActive : ''}`}
            >
              light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`${styles.themeTab} ${theme === 'dark' ? styles.themeTabActive : ''}`}
            >
              dark
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

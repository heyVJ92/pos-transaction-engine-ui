import { Outlet, Link, useNavigate } from 'react-router-dom'
import styles from './CashierLayout.module.css'
import { THEMES, useTheme } from '../theme'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../auth/token'
import ThemeToggle from '../components/ThemeToggle'

const ROLE_LABEL: Record<Role, string> = { admin: 'admin', cashier: 'cashier' }

export default function CashierLayout() {
  const [theme, setTheme] = useTheme()
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  // "exit" previously just navigated to "/" without clearing the token — LoginRoute sees a still-
  // valid token and immediately redirects right back in, so the link silently did nothing. Fixed
  // by actually calling logout() before navigating.
  const handleExit = () => {
    logout()
    navigate('/')
  }

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
          <Link to="/cashier/settings" className={styles.roleBadge}>
            <div className={styles.roleAvatar}>{role ? ROLE_LABEL[role].charAt(0).toUpperCase() : '?'}</div>
            <span className={styles.roleLabel}>{role ? ROLE_LABEL[role] : 'signed in'}</span>
          </Link>
          <button type="button" className={styles.exitLink} onClick={handleExit}>exit</button>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

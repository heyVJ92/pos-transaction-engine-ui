import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import styles from './AdminLayout.module.css'
import { THEMES, type Theme } from '../theme'

const NAV_MAIN = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/counters', label: 'Counters' },
  { to: '/admin/orders', label: 'Orders' },
]

const NAV_SYSTEM = [
  { to: '/admin/audit', label: 'Audit log' },
  { to: '/admin/demo', label: 'Concurrency demo' },
]

export default function AdminLayout() {
  const [theme, setTheme] = useState<Theme>('light')

  return (
    <div className={styles.root} style={THEMES[theme]} data-screen-label="App">
      <aside className={styles.sidebar}>
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

        <nav className={styles.nav}>
          <div className={styles.navGroupLabel}>workspace</div>
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <div className={styles.navGroupLabel}>system</div>
          {NAV_SYSTEM.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.roleRow}>
            <div className={styles.roleAvatar}>A</div>
            <div className={styles.roleText}>
              <div className={styles.roleName}>Admin</div>
              <div className={styles.roleScope}>full access</div>
            </div>
            <Link to="/" className={styles.exitLink}>exit</Link>
          </div>
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
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

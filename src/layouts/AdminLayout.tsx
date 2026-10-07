import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import styles from './AdminLayout.module.css'
import { THEMES, useTheme } from '../theme'
import NavIcon, { type NavIconName } from '../components/NavIcon'
import ProfileMenu from '../components/ProfileMenu'

interface NavItem {
  to: string
  label: string
  icon: NavIconName
}

const NAV_MAIN: NavItem[] = [
  { to: '/admin/overview', label: 'Overview', icon: 'overview' },
  { to: '/admin/products', label: 'Products', icon: 'products' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'inventory' },
  { to: '/admin/counters', label: 'Counters', icon: 'counters' },
  { to: '/admin/orders', label: 'Orders', icon: 'orders' },
]

const NAV_SYSTEM: NavItem[] = [
  { to: '/admin/audit', label: 'Audit log', icon: 'audit' },
  { to: '/admin/demo', label: 'Concurrency demo', icon: 'demo' },
]

export default function AdminLayout() {
  const [theme, setTheme] = useTheme()
  // Collapse state is deliberately local/session-only, not persisted — a display density toggle,
  // not a preference like theme that should survive a refresh. Revisit if that turns out wrong.
  const [collapsed, setCollapsed] = useState(false)

  // Decorative only — no search is actually wired up. Opens on click, closes on blur/Escape.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  return (
    <div className={styles.root} style={THEMES[theme]} data-screen-label="App">
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <NavIcon name="menu" />
          </button>

          <div className={styles.brand}>
            <div className={styles.brandText}>
              <div className={styles.wordmark}>Tender</div>
              <div className={styles.storeLabel}>store 04</div>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroupLabel}>workspace</div>
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <NavIcon name={item.icon} />
              <span className={styles.navItemLabel}>{item.label}</span>
            </NavLink>
          ))}
          <div className={styles.navGroupLabel}>system</div>
          {NAV_SYSTEM.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <NavIcon name={item.icon} />
              <span className={styles.navItemLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <ProfileMenu theme={theme} onThemeChange={setTheme} placement="sidebar-footer" collapsed={collapsed} />
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topHeader}>
          <div className={`${styles.searchWrap} ${searchOpen ? styles.searchWrapOpen : ''}`}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Search"
              title="Search — not wired yet"
              onClick={() => setSearchOpen(true)}
            >
              <NavIcon name="search" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search — not wired yet"
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') e.currentTarget.blur()
              }}
            />
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Notifications"
            title="Notifications — not wired yet"
          >
            <NavIcon name="bell" />
          </button>
        </div>

        <div className={styles.mainContent}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

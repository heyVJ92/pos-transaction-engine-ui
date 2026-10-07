import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './ProfileMenu.module.css'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../auth/token'
import type { Theme } from '../theme'
import { getCurrentUser, type User } from '../api/users'
import ThemeToggle from './ThemeToggle'
import NavIcon from './NavIcon'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', cashier: 'Cashier' }

interface ProfileMenuProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  // 'top-right' (default): compact pill, dropdown opens downward, right-aligned — the original
  // header placement. 'sidebar-footer': full-width row matching the nav items above it, dropdown
  // opens upward-left instead (there's no room below it at the bottom of the sidebar).
  placement?: 'top-right' | 'sidebar-footer'
  // Sidebar is collapsed to an icon rail — hide the name/subtitle/chevron, keep just the avatar.
  collapsed?: boolean
}

function getInitials(source: string): string {
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function ProfileMenu({
  theme,
  onThemeChange,
  placement = 'top-right',
  collapsed = false,
}: ProfileMenuProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // Decorative enrichment only (real name/email instead of just the role) — if this fails, the
    // menu falls back to role-only, silently. This isn't a screen the user is trying to load data into.
    getCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const roleLabel = role ? ROLE_LABEL[role] : 'Signed in'
  const scopeLabel = role === 'admin' ? 'full access' : role === 'cashier' ? 'counter access' : ''
  const settingsPath = role === 'cashier' ? '/cashier/settings' : '/admin/settings'
  const fullName = user ? `${user.firstName} ${user.lastName}` : null

  // Trigger (always visible) stays compact: name + role. The dropdown's own header below can
  // afford a second real data point (email) since it only shows while open.
  const triggerName = fullName ?? roleLabel
  const triggerSubtitle = fullName ? roleLabel : scopeLabel
  const initials = getInitials(triggerName) || '?'

  const themeModeLabel = theme === 'dark' ? 'Dark mode' : 'Light mode'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  const isSidebar = placement === 'sidebar-footer'

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isSidebar ? styles.triggerSidebar : ''} ${
          collapsed ? styles.triggerCollapsed : ''
        }`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.statusDot} aria-hidden="true" />
        </div>
        {!collapsed && (
          <>
            <div className={styles.text}>
              <div className={styles.name}>{triggerName}</div>
              <div className={styles.subtitle}>{triggerSubtitle}</div>
            </div>
            <NavIcon name={isSidebar ? 'chevron-up' : 'chevron-down'} size={14} />
          </>
        )}
      </button>

      {open && (
        <div className={`${styles.dropdown} ${isSidebar ? styles.dropdownSidebar : ''}`} role="menu">
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownAvatarWrap}>
              <div className={styles.dropdownAvatar}>{initials}</div>
              <span className={styles.statusDot} aria-hidden="true" />
            </div>
            <div className={styles.dropdownHeaderText}>
              <div className={styles.dropdownHeaderName}>{triggerName}</div>
              <div className={styles.dropdownHeaderSubtitle}>{user ? user.email : scopeLabel}</div>
            </div>
          </div>

          <div className={styles.divider} />

          <Link to={settingsPath} className={styles.dropdownItem} role="menuitem" onClick={() => setOpen(false)}>
            <NavIcon name="settings" size={15} />
            Settings
          </Link>

          <div className={styles.dropdownThemeRow}>
            <span className={styles.dropdownThemeLabel}>{themeModeLabel}</span>
            <ThemeToggle theme={theme} onChange={onThemeChange} />
          </div>

          <div className={styles.divider} />

          <div className={styles.dropdownFooter}>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              <NavIcon name="logout" size={14} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

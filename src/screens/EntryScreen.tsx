import { useState } from 'react'
import styles from './EntryScreen.module.css'
import { THEMES, type Theme } from '../theme'

export type Role = 'admin' | 'cashier'

const ROLE_MESSAGES: Record<Role, string> = {
  admin: '→ admin · no session created (auth pending)',
  cashier: '→ cashier · no session created (auth pending)',
}

interface EntryScreenProps {
  onSelectRole?: (role: Role) => void
}

export default function EntryScreen({ onSelectRole }: EntryScreenProps) {
  const [theme, setTheme] = useState<Theme>('light')
  const [selected, setSelected] = useState<Role | null>(null)

  const handleSelect = (role: Role) => {
    setSelected(role)
    setTimeout(() => onSelectRole?.(role), 360)
  }

  return (
    <div className={styles.root} style={THEMES[theme]} data-screen-label="Entry">
      <header className={styles.header}>
        <div className={styles.statusGroup}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>engine operational</span>
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
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.mark}>
            <div className={styles.markBarAccent} />
            <div className={styles.markBar} />
            <div className={styles.markBarSmall} />
          </div>

          <h1 className={styles.wordmark}>Tender</h1>
          <div className={styles.subtitle}>pos transaction engine</div>

          <p className={styles.description}>
            A backend reliability demo — a look at how a point-of-sale transaction engine stays
            correct under concurrent load.
          </p>

          <div className={styles.pillars}>
            <span className={styles.pillar}>concurrency control</span>
            <span className={styles.pillar}>idempotency</span>
            <span className={styles.pillar}>audit logging</span>
          </div>

          <div className={styles.roleGrid}>
            <button type="button" className={styles.roleCard} onClick={() => handleSelect('admin')}>
              <div className={styles.roleCardTop}>
                <span className={styles.roleCardLabel}>admin</span>
                <span className={styles.roleCardArrow}>→</span>
              </div>
              <div className={styles.roleCardTitle}>Continue as admin</div>
              <div className={styles.roleCardDesc}>
                Full access — replay transactions, inspect audit logs, and adjust engine limits.
              </div>
            </button>

            <button type="button" className={styles.roleCard} onClick={() => handleSelect('cashier')}>
              <div className={styles.roleCardTop}>
                <span className={styles.roleCardLabel}>cashier</span>
                <span className={styles.roleCardArrow}>→</span>
              </div>
              <div className={styles.roleCardTitle}>Continue as cashier</div>
              <div className={styles.roleCardDesc}>
                Run the register — create transactions, issue refunds, and view recent activity.
              </div>
            </button>
          </div>

          {selected && <div className={styles.selectionFeedback}>{ROLE_MESSAGES[selected]}</div>}

          <div className={styles.comingSoon}>
            <span className={styles.comingSoonBadge}>
              <span className={styles.comingSoonDot} />
              coming soon
            </span>
            <span className={styles.comingSoonText}>
              Authentication is a placeholder — pick a role to explore the demo.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}

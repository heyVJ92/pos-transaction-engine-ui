import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CashierCountersScreen.module.css'
import OpenSessionModal from '../../components/counters/OpenSessionModal'
import { ApiClientError } from '../../api/client'
import { listCounters, type Counter } from '../../api/counters'
import { listCounterSessions, type CounterSession } from '../../api/counter-sessions'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function CashierCountersScreen() {
  const navigate = useNavigate()

  const [counters, setCounters] = useState<Counter[]>([])
  const [sessionsByCounter, setSessionsByCounter] = useState<Record<string, CounterSession>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [openTarget, setOpenTarget] = useState<Counter | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [countersResult, sessionsResult] = await Promise.all([
        listCounters({ page: 1, limit: 100, sort: 'name', order: 'asc' }),
        listCounterSessions({ status: 'open', page: 1, limit: 100 }),
      ])
      setCounters(countersResult.items)
      const map: Record<string, CounterSession> = {}
      for (const session of sessionsResult.items) map[session.counter.uuid] = session
      setSessionsByCounter(map)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load counters.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchAll)
  }, [fetchAll])

  const openCount = Object.keys(sessionsByCounter).length
  const inactiveCount = counters.filter((c) => c.status === 'inactive').length
  const availableCount = counters.length - openCount - inactiveCount

  const handleOpened = () => {
    if (openTarget) navigate(`${openTarget.uuid}/register`)
    setOpenTarget(null)
  }

  return (
    <div className={styles.root} data-screen-label="Counters">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Counters</h1>
          <p className={styles.subtitle}>
            {loading ? 'Loading…' : `${openCount} open · ${availableCount} available · ${inactiveCount} unavailable`}
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={fetchAll}>
            Retry
          </button>
        </div>
      )}

      {!error && loading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {!error && !loading && counters.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>∅</div>
          <div className={styles.emptyTitle}>No counters set up yet</div>
          <div className={styles.emptySub}>Ask an admin to add one from the admin Counters screen.</div>
        </div>
      )}

      {!error && !loading && counters.length > 0 && (
        <div className={styles.grid}>
          {counters.map((counter) => {
            const session = sessionsByCounter[counter.uuid]
            const isInactive = counter.status === 'inactive'

            let badgeClass = styles.statusAvailable
            let badgeLabel: string = 'available'
            if (isInactive) {
              badgeClass = styles.statusInactive
              badgeLabel = 'unavailable'
            } else if (session) {
              badgeClass = styles.statusOpen
              badgeLabel = 'open'
            }

            return (
              <div key={counter.uuid} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{counter.name}</span>
                  <span className={`${styles.statusBadge} ${badgeClass}`}>
                    <span className={styles.statusDot} />
                    {badgeLabel}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  {session ? (
                    <div>
                      <div className={styles.total}>${session.totalAmount.toFixed(2)}</div>
                      <div className={styles.meta}>
                        {session.totalOrders} item{session.totalOrders === 1 ? '' : 's'} · opened{' '}
                        {formatTime(session.openedAt)}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.meta}>{isInactive ? 'counter unavailable' : 'no open order'}</div>
                  )}
                </div>

                {isInactive ? (
                  <button type="button" className={styles.buttonDisabled} disabled>
                    Unavailable
                  </button>
                ) : session ? (
                  <button
                    type="button"
                    className={styles.buttonPrimary}
                    onClick={() => navigate(`${counter.uuid}/register`)}
                  >
                    Resume order
                  </button>
                ) : (
                  <button type="button" className={styles.buttonSecondary} onClick={() => setOpenTarget(counter)}>
                    Open counter
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {openTarget && (
        <OpenSessionModal counter={openTarget} onClose={() => setOpenTarget(null)} onOpened={handleOpened} />
      )}
    </div>
  )
}

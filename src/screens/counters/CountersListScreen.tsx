import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './CountersListScreen.module.css'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import CounterFormModal from '../../components/counters/CounterFormModal'
import OpenSessionModal from '../../components/counters/OpenSessionModal'
import { ApiClientError, type ApiMeta } from '../../api/client'
import {
  listCounters,
  deactivateCounter,
  reactivateCounter,
  type Counter,
  type CounterStatus,
} from '../../api/counters'
import { listCounterSessions, type CounterSession } from '../../api/counter-sessions'

const LIMIT = 12
const EMPTY_META: ApiMeta = { total: 0, page: 1, limit: LIMIT, totalPages: 1 }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface CounterCardMenuProps {
  isActive: boolean
  isReactivating: boolean
  onEdit: () => void
  onSetActive: () => void
  onSetInactive: () => void
}

function CounterCardMenu({ isActive, isReactivating, onEdit, onSetActive, onSetInactive }: CounterCardMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setOpen((o) => !o)}
        aria-label="Counter actions"
      >
        ⋯
      </button>
      {open && (
        <div className={styles.menuDropdown}>
          <button
            type="button"
            className={styles.menuItem}
            disabled={!isActive}
            title={!isActive ? 'Reactivate before editing name/code' : undefined}
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            Edit
          </button>
          <div className={styles.menuDivider} />
          <button
            type="button"
            className={styles.menuItem}
            disabled={isActive || isReactivating}
            onClick={() => {
              setOpen(false)
              onSetActive()
            }}
          >
            {isReactivating ? 'Activating…' : 'Active'}
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            disabled={!isActive}
            onClick={() => {
              setOpen(false)
              onSetInactive()
            }}
          >
            Inactive
          </button>
        </div>
      )}
    </div>
  )
}

export default function CountersListScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const status = (searchParams.get('status') ?? '') as CounterStatus | ''
  const page = Number(searchParams.get('page') ?? '1')

  const [searchInput, setSearchInput] = useState(search)

  const [items, setItems] = useState<Counter[]>([])
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formTarget, setFormTarget] = useState<'new' | Counter | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Counter | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [reactivatingUuid, setReactivatingUuid] = useState<string | null>(null)
  const [sessionsByCounter, setSessionsByCounter] = useState<Record<string, CounterSession>>({})
  const [openTarget, setOpenTarget] = useState<Counter | null>(null)

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      })
    },
    [setSearchParams],
  )

  // debounce the search box before it becomes a URL param / triggers a fetch
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) updateParams({ search: searchInput || undefined, page: undefined })
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput, search, updateParams])

  const fetchCounters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [result, sessionsResult] = await Promise.all([
        listCounters({
          search: search || undefined,
          status: status || undefined,
          page,
          limit: LIMIT,
        }),
        listCounterSessions({ status: 'open', page: 1, limit: 100 }),
      ])
      setItems(result.items)
      setMeta(result.meta)
      const map: Record<string, CounterSession> = {}
      for (const session of sessionsResult.items) map[session.counter.uuid] = session
      setSessionsByCounter(map)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load counters.')
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

  useEffect(() => {
    fetchCounters()
  }, [fetchCounters])

  const handleSaved = () => {
    setFormTarget(null)
    fetchCounters()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    setDeactivateError(null)
    try {
      await deactivateCounter(deactivateTarget.uuid)
      setDeactivateTarget(null)
      fetchCounters()
    } catch (err) {
      setDeactivateError(err instanceof ApiClientError ? err.message : 'Could not deactivate counter.')
    } finally {
      setDeactivating(false)
    }
  }

  const handleReactivate = async (counter: Counter) => {
    setReactivatingUuid(counter.uuid)
    setError(null)
    try {
      await reactivateCounter(counter.uuid)
      fetchCounters()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not reactivate counter.')
    } finally {
      setReactivatingUuid(null)
    }
  }

  const hasFilters = Boolean(search || status)
  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  return (
    <div className={styles.root} data-screen-label="Counters">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Counters</h1>
          <p className={styles.subtitle}>
            {loading ? 'Loading…' : `${meta.total} counter${meta.total === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" className={styles.addButton} onClick={() => setFormTarget('new')}>
          + Add counter
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search name or code"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={fetchCounters}>
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

      {!error && !loading && items.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>∅</div>
          <div className={styles.emptyTitle}>No counters match your filters</div>
          <div className={styles.emptySub}>Try a different search term, or clear the active filters.</div>
          {hasFilters && (
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {!error && !loading && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((counter) => {
            const isActive = counter.status === 'active'
            const isReactivating = reactivatingUuid === counter.uuid
            const session = sessionsByCounter[counter.uuid]
            return (
              <div key={counter.uuid} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{counter.name}</span>
                  <div className={styles.cardTopRight}>
                    <span
                      className={`${styles.statusBadge} ${
                        isActive ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      <span className={styles.statusDot} />
                      {counter.status}
                    </span>
                    <CounterCardMenu
                      isActive={isActive}
                      isReactivating={isReactivating}
                      onEdit={() => setFormTarget(counter)}
                      onSetActive={() => handleReactivate(counter)}
                      onSetInactive={() => {
                        setDeactivateTarget(counter)
                        setDeactivateError(null)
                      }}
                    />
                  </div>
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
                    <div>
                      <span className={styles.cardCode}>{counter.code}</span>
                      <div className={styles.meta}>{isActive ? 'no open order' : 'unavailable'}</div>
                    </div>
                  )}
                </div>
                {isActive &&
                  (session ? (
                    <button
                      type="button"
                      className={styles.sessionButton}
                      onClick={() => navigate(`${counter.uuid}/register`)}
                    >
                      Resume order
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.sessionButtonSecondary}
                      onClick={() => setOpenTarget(counter)}
                    >
                      Open counter
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      )}

      {!error && !loading && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={(p) => updateParams({ page: String(p) })}
        />
      )}

      {formTarget && (
        <CounterFormModal
          counter={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Mark counter inactive"
          message={`Mark "${deactivateTarget.name}" inactive? Use this when the machine is down for the day — it can be edited less and won't be usable until reactivated, but the record and its history stay intact. You can mark it active again any time.`}
          confirmLabel="Mark inactive"
          danger
          busy={deactivating}
          error={deactivateError}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}

      {openTarget && (
        <OpenSessionModal
          counter={openTarget}
          onClose={() => setOpenTarget(null)}
          onOpened={() => {
            navigate(`${openTarget.uuid}/register`)
            setOpenTarget(null)
          }}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './OrdersListScreen.module.css'
import Pagination from '../../components/Pagination'
import { ApiClientError, type ApiMeta } from '../../api/client'
import { listOrders, type Order, type OrderStatus } from '../../api/orders'

const LIMIT = 10
const EMPTY_META: ApiMeta = { total: 0, page: 1, limit: LIMIT, totalPages: 1 }

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'draft',
  in_process: 'in process',
  hold: 'hold',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export default function OrdersListScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const pageParam = Number(searchParams.get('page') ?? '1')
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1

  const [searchInput, setSearchInput] = useState(search)
  // Tracks the last `search` we've synced from, so the box can follow external URL
  // changes (browser back/forward, a cleared filter elsewhere) — the debounce effect
  // below only pushes searchInput -> URL, never the other direction. Adjusted during
  // render (React's documented pattern for this) rather than a useEffect, since the
  // effect form would fire an extra render and trip react-hooks/set-state-in-effect.
  const [syncedSearch, setSyncedSearch] = useState(search)
  if (search !== syncedSearch) {
    setSyncedSearch(search)
    setSearchInput(search)
  }

  const [items, setItems] = useState<Order[]>([])
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

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

  const fetchOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await listOrders({ search: search || undefined, page, limit: LIMIT })
      if (requestId !== requestIdRef.current) return // superseded by a newer request — discard
      setItems(result.items)
      setMeta(result.meta)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof ApiClientError ? err.message : 'Could not load orders.')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchOrders)
  }, [fetchOrders])

  const hasFilters = Boolean(search)
  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  return (
    <div className={styles.root} data-screen-label="Orders">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>{loading ? 'Loading…' : `${meta.total} order${meta.total === 1 ? '' : 's'}`}</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search order #, cashier, or counter"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={fetchOrders}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Order</span>
            <span>Time</span>
            <span>Cashier</span>
            <span>Counter</span>
            <span className={styles.right}>Total</span>
            <span>Status</span>
          </div>

          {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}

          {!loading && items.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>∅</div>
              <div className={styles.emptyTitle}>No orders match your search</div>
              <div className={styles.emptySub}>Try a different search term, or clear it.</div>
              {hasFilters && (
                <button type="button" className={styles.clearButton} onClick={clearFilters}>
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading &&
            items.map((order) => (
              <div
                key={order.uuid}
                className={styles.row}
                role="link"
                tabIndex={0}
                aria-label={`View order ${order.orderNumber}`}
                onClick={() => navigate(order.uuid)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(order.uuid)
                  }
                }}
              >
                <span className={styles.mono}>{order.orderNumber}</span>
                <span className={styles.time}>{formatTime(order.createdAt)}</span>
                <span className={styles.cashier}>
                  {order.cashier.firstName} {order.cashier.lastName}
                </span>
                <span className={styles.counter}>
                  {order.counter.name} <span className={styles.counterCode}>{order.counter.code}</span>
                </span>
                <span className={`${styles.mono} ${styles.right}`}>{money(order.total)}</span>
                <span>
                  <span className={`${styles.statusBadge} ${styles[`status_${order.status}`] ?? styles.status_unknown}`}>
                    <span className={styles.statusDot} />
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </span>
              </div>
            ))}
        </div>
      )}

      {!error && !loading && (
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={(p) => updateParams({ page: String(p) })} />
      )}
    </div>
  )
}

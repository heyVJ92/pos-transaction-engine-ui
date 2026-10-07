import { useCallback, useEffect, useState } from 'react'
import Modal from '../Modal'
import Dropdown from '../Dropdown'
import styles from './LoadOrderModal.module.css'
import { ApiClientError } from '../../api/client'
import { listOrders, getOrder, type Order, type OrderDetail, type OrderStatus } from '../../api/orders'

interface LoadOrderModalProps {
  onClose: () => void
  onLoad: (order: OrderDetail) => void
}

const LIMIT = 20

// Only draft/hold are ever fetched here — a cancelled (or completed/expired) order is never
// queryable through this picker, so there's no row to click on in the first place, per the
// "cancelled order can't be processed again" requirement.
const STATUS_OPTIONS: { value: OrderStatus | 'loadable'; label: string }[] = [
  { value: 'loadable', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'hold', label: 'Hold' },
]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export default function LoadOrderModal({ onClose, onLoad }: LoadOrderModalProps) {
  const [status, setStatus] = useState<OrderStatus | 'loadable'>('loadable')
  const [search, setSearch] = useState('')

  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [loadingUuid, setLoadingUuid] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (status === 'loadable') {
        // GET /orders only accepts a single status value — fetch both loadable statuses and merge.
        const [draft, hold] = await Promise.all([
          listOrders({ search: search || undefined, status: 'draft', page: 1, limit: LIMIT }),
          listOrders({ search: search || undefined, status: 'hold', page: 1, limit: LIMIT }),
        ])
        const merged = [...draft.items, ...hold.items].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        setItems(merged)
      } else {
        const result = await listOrders({ search: search || undefined, status, page: 1, limit: LIMIT })
        setItems(result.items)
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    const handle = setTimeout(fetchOrders, 250)
    return () => clearTimeout(handle)
  }, [fetchOrders])

  const handlePick = async (order: Order) => {
    if (loadingUuid) return
    setLoadingUuid(order.uuid)
    setLoadError(null)
    try {
      const detail = await getOrder(order.uuid)
      onLoad(detail)
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load this order.')
      setLoadingUuid(null)
    }
  }

  return (
    <Modal title="Load order" onClose={onClose} width={560}>
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search order #, cashier, or counter"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <Dropdown
          className={styles.statusDropdown}
          value={status}
          onChange={(v) => setStatus(v as OrderStatus | 'loadable')}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          ariaLabel="Filter by status"
        />
      </div>

      {loadError && <div className={styles.errorBanner}>{loadError}</div>}

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={fetchOrders}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className={styles.list}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}

          {!loading && items.length === 0 && (
            <div className={styles.empty}>No draft or held orders match.</div>
          )}

          {!loading &&
            items.map((order) => (
              <button
                key={order.uuid}
                type="button"
                className={styles.row}
                onClick={() => handlePick(order)}
                disabled={loadingUuid !== null}
              >
                <span className={styles.mono}>{order.orderNumber}</span>
                <span className={styles.meta}>
                  {order.cashier.firstName} {order.cashier.lastName} · {order.counter.name}
                </span>
                <span className={styles.time}>{formatTime(order.updatedAt)}</span>
                <span className={`${styles.statusBadge} ${styles[`status_${order.status}`] ?? ''}`}>
                  <span className={styles.statusDot} />
                  {order.status}
                </span>
                <span className={`${styles.mono} ${styles.right}`}>
                  {loadingUuid === order.uuid ? 'Loading…' : money(order.total)}
                </span>
              </button>
            ))}
        </div>
      )}
    </Modal>
  )
}

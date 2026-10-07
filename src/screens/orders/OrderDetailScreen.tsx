import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styles from './OrderDetailScreen.module.css'
import { ApiClientError } from '../../api/client'
import { getOrder, type OrderDetail, type OrderStatus } from '../../api/orders'

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

// `payment` is written by PATCH /orders/:uuid/payment but has no GET endpoint anywhere (confirmed
// via backend verification, see docs/backend-verification-todo.md's 2026-09-23 row) — static
// placeholder values per explicit instruction, to be replaced once a real endpoint exists.
const STATIC_PAYMENT = {
  method: 'Cash',
  amountTendered: 0,
  change: 0,
}

export default function OrderDetailScreen() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!uuid) return
    setLoading(true)
    setLoadError(null)
    try {
      const detail = await getOrder(uuid)
      setOrder(detail)
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchOrder)
  }, [fetchOrder])

  if (loading) {
    return (
      <div className={styles.root} data-screen-label="Order detail">
        <Link to="/admin/orders" className={styles.backLink}>
          ‹ orders
        </Link>
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div className={styles.root} data-screen-label="Order detail">
        <Link to="/admin/orders" className={styles.backLink}>
          ‹ orders
        </Link>
        <div className={styles.errorBanner}>
          <span>{loadError ?? 'Order not found.'}</span>
          <button type="button" onClick={fetchOrder}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} data-screen-label="Order detail">
      <Link to="/admin/orders" className={styles.backLink}>
        ‹ orders
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>{order.orderNumber}</h1>
        <span className={`${styles.statusBadge} ${styles[`status_${order.status}`] ?? styles.status_unknown}`}>
          <span className={styles.statusDot} />
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        {(order.status === 'draft' || order.status === 'hold') && (
          <button
            type="button"
            className={styles.loadOrderButton}
            onClick={() => navigate(`/admin/counters/${order.counter.uuid}/register?order=${order.uuid}`)}
          >
            Load order
          </button>
        )}
      </div>
      <div className={styles.metaRow}>
        <span>placed {formatTime(order.createdAt)}</span>
        <span>
          {order.cashier.firstName} {order.cashier.lastName}
        </span>
        <span>
          {order.counter.name} <span className={styles.counterCode}>{order.counter.code}</span>
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.itemsHeader}>
            <span>Item</span>
            <span className={styles.right}>Qty</span>
            <span className={styles.right}>Price</span>
            <span className={styles.right}>Line</span>
          </div>

          {order.items.length === 0 && <div className={styles.emptyItems}>No items on this order.</div>}

          {order.items.map((item) => (
            <div key={item.uuid} className={styles.itemRow}>
              <div className={styles.itemName}>
                <div className={styles.itemNameText}>{item.product.name}</div>
                <div className={styles.itemSku}>{item.product.sku}</div>
              </div>
              <span className={`${styles.mono} ${styles.right}`}>{item.quantity}</span>
              <span className={`${styles.mono} ${styles.right}`}>{money(item.sellPrice)}</span>
              <span className={`${styles.mono} ${styles.right} ${styles.itemLine}`}>{money(item.total)}</span>
            </div>
          ))}

          <div className={styles.totals}>
            <div className={styles.totalsRow}>
              <span>subtotal</span>
              <span>{money(order.subTotal)}</span>
            </div>
            <div className={styles.totalsRow}>
              <span>tax</span>
              <span>{money(order.tax)}</span>
            </div>
            <div className={`${styles.totalsRow} ${styles.totalsGrand}`}>
              <span>total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>
        </div>

        <div className={styles.sidePanels}>
          <div className={styles.panel}>
            <div className={styles.panelLabel}>customer</div>
            <div className={styles.customerPanel}>
              <span className={styles.walkInBadge}>Walk-in customer</span>
              <p className={styles.lifecycleReason}>
                No customer accounts exist yet — every order is treated as a walk-in sale.
              </p>
            </div>
          </div>

          {order.status === 'completed' && (
            <div className={styles.panel}>
              <div className={styles.panelLabel}>payment</div>
              <div className={styles.paymentPanel}>
                <span className={styles.notWiredBadge}>
                  <span className={styles.statusDot} />
                  static placeholder — not wired yet
                </span>
                <div className={styles.paymentRow}>
                  <span>Method</span>
                  <span>{STATIC_PAYMENT.method}</span>
                </div>
                <div className={styles.paymentRow}>
                  <span>Amount tendered</span>
                  <span>{money(STATIC_PAYMENT.amountTendered)}</span>
                </div>
                <div className={styles.paymentRow}>
                  <span>Change</span>
                  <span>{money(STATIC_PAYMENT.change)}</span>
                </div>
                <p className={styles.docsHint}>docs/backend-verification-todo.md (2026-09-23) — no GET endpoint for payment data yet</p>
              </div>
            </div>
          )}

          <div className={styles.panel}>
            <div className={styles.panelLabel}>lifecycle</div>
            <div className={styles.lifecycleStub}>
              <span className={styles.notWiredBadge}>
                <span className={styles.statusDot} />
                not wired yet
              </span>
              <p className={styles.lifecycleReason}>
                No audit-log API exists yet to source order status history from.
              </p>
              <p className={styles.docsHint}>docs/api-reference.md#known-gaps--drift-from-the-prd</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

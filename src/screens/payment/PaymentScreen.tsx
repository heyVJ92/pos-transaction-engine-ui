import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './PaymentScreen.module.css'
import { ApiClientError } from '../../api/client'
import { getOrder, payOrder, type OrderDetail, type PaymentMode, type PayOrderResult } from '../../api/orders'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

function roundUpTo(amount: number, step: number): number {
  return Math.ceil(amount / step) * step
}

// exact total first, then round-up-to-whole-dollar quick amounts, deduped
function quickCashAmounts(total: number): number[] {
  const amounts = [total, roundUpTo(total, 5), roundUpTo(total, 10), roundUpTo(total, 20)]
  return amounts.filter((amount, i) => amounts.indexOf(amount) === i)
}

const MODE_LABEL: Record<PaymentMode, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

export default function PaymentScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const orderUuid = searchParams.get('order')
  // counters/:uuid/payment is a flat <Route>, not nested — relative navigate('../..') resolves
  // by route-tree depth, not URL segments, and lands somewhere wrong. Absolute path instead.
  const rolePrefix = location.pathname.startsWith('/cashier') ? '/cashier' : '/admin'

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [mode, setMode] = useState<PaymentMode>('cash')
  const [amountInput, setAmountInput] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [result, setResult] = useState<PayOrderResult | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!orderUuid) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const detail = await getOrder(orderUuid)
      setOrder(detail)
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [orderUuid])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchOrder)
  }, [fetchOrder])

  const backToCounters = () => navigate(`${rolePrefix}/counters`)

  const handlePay = async () => {
    if (!orderUuid || !order || paying) return
    const amountTendered = mode === 'cash' ? Number(amountInput) : order.total
    if (mode === 'cash' && (!amountInput || Number.isNaN(amountTendered) || amountTendered < order.total)) {
      setPayError(`Amount tendered must be at least ${money(order.total)}.`)
      return
    }
    setPaying(true)
    setPayError(null)
    try {
      const paymentResult = await payOrder(orderUuid, { mode, amountTendered })
      setResult(paymentResult)
    } catch (err) {
      setPayError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const pressKey = (key: string) => {
    setPayError(null)
    if (key === '⌫') {
      setAmountInput((prev) => prev.slice(0, -1))
      return
    }
    if (key === '.' && amountInput.includes('.')) return
    setAmountInput((prev) => prev + key)
  }

  if (!orderUuid) {
    return (
      <div className={styles.root} data-screen-label="Payment">
        <div className={styles.errorBanner}>
          <span>No order to pay for — start from Register.</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.root} data-screen-label="Payment">
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div className={styles.root} data-screen-label="Payment">
        <div className={styles.errorBanner}>
          <span>{loadError ?? 'Order not found.'}</span>
          <button type="button" onClick={fetchOrder}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className={styles.root} data-screen-label="Payment">
        <div className={styles.doneCard}>
          <div className={styles.doneIcon}>✓</div>
          <h2 className={styles.doneTitle}>Payment complete</h2>
          <div className={styles.doneMeta}>
            {order.orderNumber} · {money(result.payment.amount)} · {MODE_LABEL[result.payment.mode]}
          </div>
          {result.payment.change > 0 && (
            <div className={styles.changeBadge}>change due {money(result.payment.change)}</div>
          )}
          <div className={styles.doneActions}>
            <button type="button" className={styles.secondaryButton} disabled title="Not wired yet — no printer integration exists">
              Print receipt
            </button>
            <button type="button" className={styles.primaryButton} onClick={backToCounters}>
              Back to counters
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (order.status !== 'in_process') {
    return (
      <div className={styles.root} data-screen-label="Payment">
        <div className={styles.errorBanner}>
          <span>
            This order isn't ready for payment (status: {order.status}). Run checkout from Register first.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} data-screen-label="Payment">
      <div className={styles.card}>
        <div className={styles.grid}>
          <div className={styles.summaryPanel}>
            <h2 className={styles.title}>Payment</h2>
            <div className={styles.metaLabel}>order</div>
            <div className={styles.orderRow}>
              <div className={styles.orderMono}>{order.orderNumber.slice(-2)}</div>
              <div className={styles.orderInfo}>
                <div className={styles.orderNumber}>{order.orderNumber}</div>
                <div className={styles.orderSub}>
                  {order.counter.name} <span className={styles.counterCode}>{order.counter.code}</span>
                </div>
              </div>
              <div className={styles.orderTime}>{formatTime(order.createdAt)}</div>
            </div>

            <div className={styles.linesPanel}>
              <div className={styles.metaLabel}>transaction details</div>
              {order.items.map((item) => (
                <div key={item.uuid} className={styles.lineRow}>
                  <div className={styles.lineName}>
                    <span>{item.product.name}</span> <span className={styles.lineQty}>×{item.quantity}</span>
                  </div>
                  <span className={styles.lineTotal}>{money(item.sellPrice * item.quantity)}</span>
                </div>
              ))}
              <div className={styles.totals}>
                <div className={styles.totalsRow}>
                  <span>Items ({order.items.length})</span>
                  <span>{money(order.subTotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className={styles.totalsRow}>
                    <span>Discount</span>
                    <span>−{order.discount}%</span>
                  </div>
                )}
                <div className={styles.totalsRow}>
                  <span>Tax</span>
                  <span>{money(order.tax)}</span>
                </div>
                <div className={styles.totalsGrand}>
                  <span>Total</span>
                  <span>{money(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.payPanel}>
            <div className={styles.metaLabel}>select a payment method</div>
            <select
              className={styles.modeSelect}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as PaymentMode)
                setPayError(null)
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>

            {payError && <div className={styles.payError}>{payError}</div>}

            {mode === 'cash' ? (
              <>
                <div className={styles.amountDisplay}>{amountInput ? `$${amountInput}` : money(0)}</div>
                <div className={styles.chipRow}>
                  {quickCashAmounts(order.total).map((amount, i) => (
                    <button
                      key={amount}
                      type="button"
                      className={styles.chip}
                      onClick={() => setAmountInput(amount.toFixed(2))}
                    >
                      {i === 0 ? 'Exact' : money(amount)}
                    </button>
                  ))}
                </div>
                <div className={styles.numpad}>
                  {NUMPAD_KEYS.map((key) => (
                    <button key={key} type="button" className={styles.numpadKey} onClick={() => pressKey(key)}>
                      {key}
                    </button>
                  ))}
                </div>
                {Number(amountInput) > order.total && (
                  <div className={styles.changePreview}>
                    <span>change due</span>
                    <span>{money(Number(amountInput) - order.total)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.terminalStub}>
                <div className={styles.terminalIcon}>⌾</div>
                <div className={styles.terminalTitle}>Charge via {MODE_LABEL[mode]}</div>
                <div className={styles.terminalSub}>amount due {money(order.total)}</div>
              </div>
            )}

            <button type="button" className={styles.payButton} onClick={handlePay} disabled={paying}>
              {paying ? 'Processing…' : `Pay now (${money(order.total)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

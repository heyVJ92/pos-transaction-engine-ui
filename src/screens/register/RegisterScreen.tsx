import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import styles from './RegisterScreen.module.css'
import { ApiClientError } from '../../api/client'
import { listProducts, PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../api/products'
import { listCounterSessions, type CounterSession } from '../../api/counter-sessions'
import { addOrderItem, checkoutOrder, createOrder, editOrderItem, holdOrder, removeOrderItem } from '../../api/orders'

interface CartLine {
  product: Product
  itemUuid: string
  qty: number
}

interface StockErrorDetail {
  productName: string
  sku: string
  requested: number
  available: number
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

const CHECKOUT_WIDTH_KEY = 'register.checkoutWidth'
const DEFAULT_CHECKOUT_WIDTH = 372
const MIN_CHECKOUT_WIDTH = 320
const MAX_CHECKOUT_WIDTH = 560

function clampCheckoutWidth(width: number): number {
  return Math.min(MAX_CHECKOUT_WIDTH, Math.max(MIN_CHECKOUT_WIDTH, width))
}

export default function RegisterScreen() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  // `counters/:uuid/register` and `counters/:uuid/payment` are each registered as one flat
  // <Route>, not nested — so a relative navigate('../payment') resolves by route-tree depth,
  // not URL segments, and jumps straight past the whole route to /admin or /cashier. Build an
  // absolute path instead, rather than rely on relative resolution matching the URL shape.
  const rolePrefix = location.pathname.startsWith('/cashier') ? '/cashier' : '/admin'

  const [session, setSession] = useState<CounterSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [discountPct, setDiscountPct] = useState('0')

  const [orderUuid, setOrderUuid] = useState<string | null>(null)
  const [orderTotals, setOrderTotals] = useState<{ subTotal: number; tax: number; orderTotal: number } | null>(null)
  const [cartBusy, setCartBusy] = useState(false)
  const [holding, setHolding] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)
  const [stockError, setStockError] = useState<StockErrorDetail | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [checkoutWidth, setCheckoutWidth] = useState(() => {
    const stored = Number(localStorage.getItem(CHECKOUT_WIDTH_KEY))
    return stored ? clampCheckoutWidth(stored) : DEFAULT_CHECKOUT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    if (!isResizing) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !bodyRef.current) return
    const containerRight = bodyRef.current.getBoundingClientRect().right
    setCheckoutWidth(clampCheckoutWidth(containerRight - e.clientX))
  }

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsResizing(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
    setCheckoutWidth((w) => {
      localStorage.setItem(CHECKOUT_WIDTH_KEY, String(w))
      return w
    })
  }

  useEffect(() => {
    if (!uuid) return
    let cancelled = false
    // Deferred a microtask so the setState calls below aren't synchronous within the effect
    // body (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(() => {
      if (cancelled) return
      setSessionLoading(true)
      setSessionError(null)
      listCounterSessions({ counterUuid: uuid, status: 'open', page: 1, limit: 1 })
        .then((result) => {
          if (cancelled) return
          setSession(result.items[0] ?? null)
        })
        .catch((err) => {
          if (cancelled) return
          setSessionError(err instanceof ApiClientError ? err.message : 'Could not load this session.')
        })
        .finally(() => {
          if (!cancelled) setSessionLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [uuid])

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const result = await listProducts({ status: 'active', page: 1, limit: 100 })
      setProducts(result.items)
    } catch (err) {
      setProductsError(err instanceof ApiClientError ? err.message : 'Could not load products.')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchProducts)
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (term && !p.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [products, search, category])

  // First tap on a product creates the line via POST (server auto-inits qty 1). A repeat tap
  // on an already-in-cart tile goes through adjustQty instead (see the tile's onClick below) —
  // POST only inserts, it can't bump an existing line's quantity.
  const addToCart = async (product: Product) => {
    if (cartBusy || cart[product.uuid]) return
    if (!session) {
      setCartError('No open session found for this counter.')
      return
    }
    setCartBusy(true)
    setCartError(null)
    setStockError(null)
    try {
      let currentOrderUuid = orderUuid
      if (!currentOrderUuid) {
        const created = await createOrder({ sessionUuid: session.uuid })
        currentOrderUuid = created.uuid
        setOrderUuid(created.uuid)
      }
      const result = await addOrderItem(currentOrderUuid, { productUuid: product.uuid, quantity: 1 })
      setCart((prev) => ({ ...prev, [product.uuid]: { product, itemUuid: result.uuid, qty: result.quantity } }))
      setOrderTotals({ subTotal: result.subTotal, tax: result.tax, orderTotal: result.orderTotal })
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'INSUFFICIENT_STOCK') {
        setStockError(err.details as StockErrorDetail)
      } else if (err instanceof ApiClientError) {
        setCartError(err.message)
      } else {
        setCartError('Something went wrong. Please try again.')
      }
    } finally {
      setCartBusy(false)
    }
  }

  const removeLine = async (product: Product) => {
    const line = cart[product.uuid]
    if (!line || cartBusy || !orderUuid) return
    setCartBusy(true)
    setCartError(null)
    setStockError(null)
    try {
      const result = await removeOrderItem(orderUuid, line.itemUuid)
      setCart((prev) => {
        const next = { ...prev }
        delete next[product.uuid]
        return next
      })
      setOrderTotals({ subTotal: result.subTotal, tax: result.tax, orderTotal: result.orderTotal })
    } catch (err) {
      setCartError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setCartBusy(false)
    }
  }

  const adjustQty = async (product: Product, delta: number) => {
    const line = cart[product.uuid]
    if (!line || cartBusy || !orderUuid) return
    const nextQty = line.qty + delta
    if (nextQty < 0) return
    setCartBusy(true)
    setCartError(null)
    setStockError(null)
    try {
      const result = await editOrderItem(orderUuid, line.itemUuid, { quantity: nextQty })
      if (result.quantity === 0) {
        // same outcome as tapping remove — the backend deletes the line at qty 0
        setCart((prev) => {
          const next = { ...prev }
          delete next[product.uuid]
          return next
        })
      } else {
        setCart((prev) => ({ ...prev, [product.uuid]: { ...prev[product.uuid]!, qty: result.quantity } }))
      }
      setOrderTotals({ subTotal: result.subTotal, tax: result.tax, orderTotal: result.orderTotal })
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'INSUFFICIENT_STOCK') {
        setStockError(err.details as StockErrorDetail)
      } else if (err instanceof ApiClientError) {
        setCartError(err.message)
      } else {
        setCartError('Something went wrong. Please try again.')
      }
    } finally {
      setCartBusy(false)
    }
  }

  const handlePay = async () => {
    if (!orderUuid || cartBusy || lines.length === 0) return
    setCartBusy(true)
    setCheckingOut(true)
    setCartError(null)
    try {
      await checkoutOrder(orderUuid)
      navigate(`${rolePrefix}/counters/${uuid}/payment?order=${orderUuid}`)
    } catch (err) {
      setCartError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
      setCartBusy(false)
      setCheckingOut(false)
    }
  }

  const handleHold = async () => {
    if (!orderUuid || cartBusy) return
    setCartBusy(true)
    setHolding(true)
    setCartError(null)
    try {
      await holdOrder(orderUuid)
      navigate(-1)
    } catch (err) {
      setCartError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
      setCartBusy(false)
      setHolding(false)
    }
  }

  const lines = Object.values(cart)
  const subtotal = orderTotals?.subTotal ?? 0
  const taxTotal = orderTotals?.tax ?? 0
  const discountValue = Number(discountPct) || 0
  const discountAmount = subtotal * (discountValue / 100)
  const total = orderTotals?.orderTotal ?? 0
  const discountLocked = orderUuid !== null

  const counterName = session?.counter.name ?? 'Register'

  return (
    <div className={styles.root} data-screen-label="Register">
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
        <div className={styles.headerText}>
          <div className={styles.headerName}>{counterName}</div>
          <div className={styles.headerMeta}>
            {sessionLoading
              ? 'Loading…'
              : sessionError
                ? sessionError
                : session
                  ? `opened ${formatTime(session.openedAt)}`
                  : 'no open session found for this counter'}
          </div>
        </div>
      </header>

      <div className={styles.body} ref={bodyRef}>
        <div className={styles.catalogPane}>
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.catalogScroll}>
            {productsError && (
              <div className={styles.errorBanner}>
                <span>{productsError}</span>
                <button type="button" onClick={fetchProducts}>
                  Retry
                </button>
              </div>
            )}

            {!productsError && productsLoading && (
              <div className={styles.catalogGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeletonTile} />
                ))}
              </div>
            )}

            {!productsError && !productsLoading && filteredProducts.length === 0 && (
              <div className={styles.catalogEmpty}>no items match "{search}"</div>
            )}

            {!productsError && !productsLoading && filteredProducts.length > 0 && (
              <div className={styles.catalogGrid}>
                {filteredProducts.map((product) => {
                  const inCart = Boolean(cart[product.uuid])
                  return (
                    <button
                      key={product.uuid}
                      type="button"
                      className={`${styles.tile} ${inCart ? styles.tileAdded : ''}`}
                      onClick={() => (inCart ? adjustQty(product, 1) : addToCart(product))}
                      disabled={cartBusy}
                      title={inCart ? 'Tap again to add another' : undefined}
                    >
                      {inCart && <span className={styles.tileBadge}>✓ {cart[product.uuid]!.qty} in cart</span>}
                      <div className={styles.tileMono}>
                        {product.sku
                          .replace(/[^A-Za-z0-9]/g, '')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className={styles.tileName}>{product.name}</div>
                      <div className={styles.tilePrice}>{money(product.sellPrice)}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className={styles.catTabs}>
            <button
              type="button"
              className={`${styles.catTab} ${category === 'all' ? styles.catTabActive : ''}`}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {PRODUCT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.catTab} ${category === c ? styles.catTabActive : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize checkout panel"
        />

        <div className={styles.checkoutPane} style={{ width: checkoutWidth }}>
          <div className={styles.checkoutHeader}>
            <span className={styles.checkoutTitle}>Checkout</span>
            <span className={styles.checkoutCounter}>{counterName}</span>
          </div>

          {stockError && (
            <div className={`${styles.errorBanner} ${styles.checkoutError}`}>
              <span>
                Only {stockError.available} of {stockError.productName} ({stockError.sku}) available —
                requested {stockError.requested}.
              </span>
              <button type="button" onClick={() => setStockError(null)}>
                Dismiss
              </button>
            </div>
          )}
          {cartError && (
            <div className={`${styles.errorBanner} ${styles.checkoutError}`}>
              <span>{cartError}</span>
              <button type="button" onClick={() => setCartError(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className={styles.cartColumns}>
            <span>Item</span>
            <span className={styles.center}>Qty</span>
            <span className={styles.right}>Price</span>
          </div>

          <div className={styles.cartScroll}>
            {lines.length === 0 ? (
              <div className={styles.cartEmpty}>
                <div className={styles.cartEmptyTitle}>Cart is empty</div>
                <div className={styles.cartEmptySub}>tap items on the left to add them</div>
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.product.uuid} className={styles.cartRow}>
                  <div className={styles.cartItemName}>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeLine(l.product)}
                      disabled={cartBusy}
                      aria-label={`Remove ${l.product.name}`}
                    >
                      ✕
                    </button>
                    <span className={styles.cartItemLabel}>{l.product.name}</span>
                  </div>
                  <div className={styles.qtyControls}>
                    <button
                      type="button"
                      onClick={() => adjustQty(l.product, -1)}
                      disabled={cartBusy}
                      aria-label={`Decrease quantity of ${l.product.name}`}
                    >
                      −
                    </button>
                    <span className={styles.qtyValue}>{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(l.product, 1)}
                      disabled={cartBusy}
                      aria-label={`Increase quantity of ${l.product.name}`}
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.cartLinePrice}>{money(l.product.sellPrice * l.qty)}</span>
                </div>
              ))
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Discount (%)</span>
              <input
                className={styles.discountInput}
                inputMode="numeric"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                disabled={discountLocked}
                title={
                  discountLocked
                    ? "Locked once the order starts — editing an existing order's discount isn't wired yet"
                    : undefined
                }
              />
            </div>
            {discountLocked && <div className={styles.lockHint}>Locked for this order</div>}
            <div className={styles.summaryLine}>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className={styles.summaryLine}>
                <span>Discount</span>
                <span>−{money(discountAmount)}</span>
              </div>
            )}
            <div className={styles.summaryLine}>
              <span>Tax</span>
              <span>{money(taxTotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.cancelButton} onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.holdButton}
                onClick={handleHold}
                disabled={!orderUuid || cartBusy}
                title={!orderUuid ? 'Add an item first to start an order' : undefined}
              >
                {holding ? 'Holding…' : 'Hold'}
              </button>
              <button
                type="button"
                className={styles.payButton}
                onClick={handlePay}
                disabled={!orderUuid || cartBusy || lines.length === 0}
                title={!orderUuid || lines.length === 0 ? 'Add an item first' : undefined}
              >
                {checkingOut ? 'Starting checkout…' : `Pay (${money(total)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

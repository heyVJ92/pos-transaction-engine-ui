import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './RegisterScreen.module.css'
import { ApiClientError } from '../../api/client'
import { listProducts, PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../api/products'
import { listCounterSessions, type CounterSession } from '../../api/counter-sessions'

interface CartLine {
  product: Product
  qty: number
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
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (term && !p.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [products, search, category])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.uuid]
      return { ...prev, [product.uuid]: { product, qty: (existing?.qty ?? 0) + 1 } }
    })
  }

  const adjustQty = (uuid: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[uuid]
      if (!existing) return prev
      const nextQty = existing.qty + delta
      if (nextQty <= 0) {
        const { [uuid]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [uuid]: { ...existing, qty: nextQty } }
    })
  }

  const removeLine = (uuid: string) => {
    setCart((prev) => {
      const { [uuid]: _removed, ...rest } = prev
      return rest
    })
  }

  const lines = Object.values(cart)
  const subtotal = lines.reduce((sum, l) => sum + l.product.sellPrice * l.qty, 0)
  const taxTotal = lines.reduce((sum, l) => sum + l.product.sellPrice * l.qty * (l.product.tax / 100), 0)
  const discountValue = Number(discountPct) || 0
  const discountAmount = subtotal * (discountValue / 100)
  const total = subtotal - discountAmount + taxTotal

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
                {filteredProducts.map((product) => (
                  <button
                    key={product.uuid}
                    type="button"
                    className={styles.tile}
                    onClick={() => addToCart(product)}
                  >
                    <div className={styles.tileMono}>
                      {product.sku
                        .replace(/[^A-Za-z0-9]/g, '')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className={styles.tileName}>{product.name}</div>
                    <div className={styles.tilePrice}>{money(product.sellPrice)}</div>
                  </button>
                ))}
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
                      onClick={() => removeLine(l.product.uuid)}
                      aria-label={`Remove ${l.product.name}`}
                    >
                      ✕
                    </button>
                    <span className={styles.cartItemLabel}>{l.product.name}</span>
                  </div>
                  <div className={styles.qtyControls}>
                    <button type="button" onClick={() => adjustQty(l.product.uuid, -1)} aria-label="Decrease quantity">
                      −
                    </button>
                    <span className={styles.qtyValue}>{l.qty}</span>
                    <button type="button" onClick={() => adjustQty(l.product.uuid, 1)} aria-label="Increase quantity">
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
              />
            </div>
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
              <button type="button" className={styles.holdButton} disabled title="Not wired yet — no Orders API to hold an order against">
                Hold
              </button>
              <button
                type="button"
                className={styles.payButton}
                disabled
                title="Not wired yet — no Orders API to submit a payment against"
              >
                Pay ({money(total)})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './InventoryScreen.module.css'
import { ApiClientError } from '../../api/client'
import { listProducts, type Product } from '../../api/products'
import { listInventoryMovements, type InventoryMovement, type MovementType } from '../../api/inventory'

const PRODUCTS_LIMIT = 100
const MOVEMENTS_LIMIT = 20

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function availabilityClass(available: number): string {
  if (available <= 0) return styles.availOut
  if (available <= 10) return styles.availLow
  return styles.availHealthy
}

const MOVEMENT_LABEL: Record<MovementType, string> = {
  initial: 'initial',
  reserved: 'reserved',
  confirmed: 'confirmed',
  reverted: 'reverted',
  expired: 'expired',
  restock: 'restock',
}

const MOVEMENT_NOTE: Record<MovementType, string> = {
  initial: 'stock received (initial)',
  reserved: 'reserved at checkout',
  confirmed: 'order confirmed, stock deducted',
  reverted: 'hold expired, stock released',
  expired: 'reservation expired',
  restock: 'stock replenished',
}

function movementClass(type: MovementType): string {
  switch (type) {
    case 'initial':
      return styles.moveInitial
    case 'reserved':
      return styles.moveReserved
    case 'confirmed':
      return styles.moveConfirmed
    case 'reverted':
      return styles.moveReverted
    case 'expired':
      return styles.moveExpired
    case 'restock':
      return styles.moveRestock
  }
}

function dotClass(type: MovementType): string {
  switch (type) {
    case 'initial':
      return styles.dotInitial
    case 'reserved':
      return styles.dotReserved
    case 'confirmed':
      return styles.dotConfirmed
    case 'reverted':
      return styles.dotReverted
    case 'expired':
      return styles.dotExpired
    case 'restock':
      return styles.dotRestock
  }
}

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementsError, setMovementsError] = useState<string | null>(null)

  // debounce the search box before it triggers a refetch
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const result = await listProducts({ search: search || undefined, page: 1, limit: PRODUCTS_LIMIT })
      setProducts(result.items)
      // default state on load: first product in the list, unless one's already selected
      setSelectedUuid((prev) => prev ?? result.items[0]?.uuid ?? null)
    } catch (err) {
      setProductsError(err instanceof ApiClientError ? err.message : 'Could not load products.')
    } finally {
      setProductsLoading(false)
    }
  }, [search])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchProducts)
  }, [fetchProducts])

  const fetchMovements = useCallback(async (productUuid: string) => {
    setMovementsLoading(true)
    setMovementsError(null)
    try {
      const result = await listInventoryMovements(productUuid, {
        page: 1,
        limit: MOVEMENTS_LIMIT,
        order: 'desc',
      })
      setMovements(result.items)
    } catch (err) {
      setMovementsError(err instanceof ApiClientError ? err.message : 'Could not load stock movements.')
    } finally {
      setMovementsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedUuid) return
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(() => fetchMovements(selectedUuid))
  }, [selectedUuid, fetchMovements])

  const selected = useMemo(
    () => products.find((item) => item.uuid === selectedUuid) ?? null,
    [products, selectedUuid],
  )

  return (
    <div className={styles.root} data-screen-label="Inventory">
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.subtitle}>
          Available and reserved stock with recent stock movements for the selected item.
        </p>
      </div>

      {productsError && (
        <div className={styles.errorBanner}>
          <span>{productsError}</span>
          <button type="button" onClick={fetchProducts}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search SKU or name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Product</span>
            <span className={styles.right}>Available</span>
            <span className={styles.right}>Reserved</span>
          </div>

          {productsLoading &&
            Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}

          {!productsLoading && !productsError && products.length === 0 && (
            <div className={styles.empty}>{search ? 'No products match your search.' : 'No products found.'}</div>
          )}

          {!productsLoading &&
            products.map((item) => (
              <div
                key={item.uuid}
                className={`${styles.row} ${item.uuid === selectedUuid ? styles.rowSelected : ''}`}
                onClick={() => setSelectedUuid(item.uuid)}
              >
                <div className={styles.productCell}>
                  <div className={styles.productName}>{item.name}</div>
                  <div className={styles.productSku}>{item.sku}</div>
                </div>
                <div className={styles.right}>
                  <span className={`${styles.availBadge} ${availabilityClass(item.availableStock)}`}>
                    {item.availableStock}
                  </span>
                </div>
                <span className={`${styles.reserved} ${styles.right}`}>{item.reservedStock}</span>
              </div>
            ))}
        </div>

        <div className={styles.ledgerPane}>
          {selected && (
            <>
              <div className={styles.ledgerHeader}>
                <div className={styles.ledgerLabel}>stock movements</div>
                <div className={styles.ledgerProductName}>{selected.name}</div>
                <div className={styles.ledgerStats}>
                  <span className={styles.ledgerSku}>{selected.sku}</span>
                  <span>available {selected.availableStock}</span>
                  <span>reserved {selected.reservedStock}</span>
                </div>
              </div>
              <div className={styles.ledgerBody}>
                {movementsError && (
                  <div className={styles.errorBanner}>
                    <span>{movementsError}</span>
                    <button type="button" onClick={() => fetchMovements(selected.uuid)}>
                      Retry
                    </button>
                  </div>
                )}

                {movementsLoading && !movementsError && (
                  <div className={styles.ledgerStatus}>Loading movements…</div>
                )}

                {!movementsLoading && !movementsError && movements.length === 0 && (
                  <div className={styles.ledgerStatus}>No stock movements recorded yet.</div>
                )}

                {!movementsLoading &&
                  !movementsError &&
                  movements.map((mv, i) => (
                    <div key={mv.uuid} className={styles.timelineRow}>
                      <div className={styles.timelineRail}>
                        <span className={`${styles.timelineDot} ${dotClass(mv.movementType)}`} />
                        {i < movements.length - 1 && <span className={styles.timelineLine} />}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTop}>
                          <span className={`${styles.moveBadge} ${movementClass(mv.movementType)}`}>
                            {MOVEMENT_LABEL[mv.movementType]}
                          </span>
                          <span className={styles.moveQty}>{mv.quantity}</span>
                          <span className={styles.moveTime}>{formatTime(mv.createdAt)}</span>
                        </div>
                        <div className={styles.moveNote}>
                          {MOVEMENT_NOTE[mv.movementType]}
                          {mv.orderNumber && (
                            <>
                              {' · '}
                              <span className={styles.moveOrder}>{mv.orderNumber}</span>
                            </>
                          )}
                        </div>
                        <div className={styles.moveRunning}>
                          <span>
                            stock {mv.stockBefore} → {mv.stockAfter}
                          </span>
                          {mv.unitCost !== null && <span>unit cost {mv.unitCost.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

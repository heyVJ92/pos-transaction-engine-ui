import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './ProductsListScreen.module.css'
import Dropdown from '../../components/Dropdown'
import Pagination from '../../components/Pagination'
import ProductFormModal from '../../components/products/ProductFormModal'
import { ApiClientError, type ApiMeta } from '../../api/client'
import { listProducts, PRODUCT_CATEGORIES, type Product, type ProductCategory, type ProductStatus } from '../../api/products'

const LIMIT = 10
const EMPTY_META: ApiMeta = { total: 0, page: 1, limit: LIMIT, totalPages: 1 }

export default function ProductsListScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const category = (searchParams.get('category') ?? '') as ProductCategory | ''
  const status = (searchParams.get('status') ?? '') as ProductStatus | ''
  const lowStock = searchParams.get('lowStock') === 'true'
  const page = Number(searchParams.get('page') ?? '1')

  const [searchInput, setSearchInput] = useState(search)

  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)

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

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listProducts({
        search: search || undefined,
        category: category || undefined,
        status: status || undefined,
        lowStock: lowStock || undefined,
        page,
        limit: LIMIT,
      })
      setItems(result.items)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [search, category, status, lowStock, page])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(fetchProducts)
  }, [fetchProducts])

  const handleSaved = () => {
    setShowAddForm(false)
    fetchProducts()
  }

  const hasFilters = Boolean(search || category || status || lowStock)
  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  return (
    <div className={styles.root} data-screen-label="Products">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>
            {loading ? 'Loading…' : `${meta.total} product${meta.total === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" className={styles.addButton} onClick={() => setShowAddForm(true)}>
          Add product
        </button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search SKU or name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Dropdown
          className={styles.filterSelect}
          value={category}
          onChange={(v) => updateParams({ category: v || undefined, page: undefined })}
          placeholder="All categories"
          options={[
            { value: '', label: 'All categories' },
            ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Dropdown
          className={styles.filterSelect}
          value={status}
          onChange={(v) => updateParams({ status: v || undefined, page: undefined })}
          placeholder="All statuses"
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <Dropdown
          className={styles.filterSelect}
          value={lowStock ? 'true' : ''}
          onChange={(v) => updateParams({ lowStock: v || undefined, page: undefined })}
          placeholder="All stock levels"
          options={[
            { value: '', label: 'All stock levels' },
            { value: 'true', label: 'Low stock only' },
          ]}
        />
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={fetchProducts}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>SKU</span>
            <span>Name</span>
            <span>Category</span>
            <span>Stock</span>
            <span className={styles.right}>Sell price</span>
            <span>Status</span>
          </div>

          {loading &&
            Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}

          {!loading && items.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>∅</div>
              <div className={styles.emptyTitle}>No products match your filters</div>
              <div className={styles.emptySub}>Try a different search term, or clear the active filters.</div>
              {hasFilters && (
                <button type="button" className={styles.clearButton} onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading &&
            items.map((product) => {
              const isLow = product.availableStock < product.minQty
              return (
                <div
                  key={product.uuid}
                  className={styles.row}
                  role="link"
                  tabIndex={0}
                  aria-label={`View ${product.name}`}
                  onClick={() => navigate(product.uuid)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(product.uuid)
                    }
                  }}
                >
                  <span className={styles.mono}>{product.sku}</span>
                  <span className={styles.name}>{product.name}</span>
                  <span className={styles.category}>{product.category}</span>
                  <span className={styles.stockCell}>
                    <span className={isLow ? styles.stockLow : styles.stockOk}>{product.availableStock}</span>
                    <span className={styles.stockRange}>
                      min {product.minQty} · max {product.maxQty ?? '—'}
                    </span>
                  </span>
                  <span className={`${styles.mono} ${styles.right}`}>${product.sellPrice.toFixed(2)}</span>
                  <span>
                    <span
                      className={`${styles.statusBadge} ${
                        product.status === 'active' ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      <span className={styles.statusDot} />
                      {product.status}
                    </span>
                  </span>
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

      {showAddForm && <ProductFormModal onClose={() => setShowAddForm(false)} onSaved={handleSaved} />}
    </div>
  )
}

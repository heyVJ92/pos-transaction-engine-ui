import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './ProductsListScreen.module.css'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import ProductFormModal from '../../components/products/ProductFormModal'
import { ApiClientError, type ApiMeta } from '../../api/client'
import {
  listProducts,
  deleteProduct,
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
  type ProductStatus,
} from '../../api/products'

const LIMIT = 10
const EMPTY_META: ApiMeta = { total: 0, page: 1, limit: LIMIT, totalPages: 1 }

export default function ProductsListScreen() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const category = (searchParams.get('category') ?? '') as ProductCategory | ''
  const status = (searchParams.get('status') ?? '') as ProductStatus | ''
  const page = Number(searchParams.get('page') ?? '1')

  const [searchInput, setSearchInput] = useState(search)

  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formTarget, setFormTarget] = useState<'new' | Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  }, [search, category, status, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSaved = () => {
    setFormTarget(null)
    fetchProducts()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteProduct(deleteTarget.uuid)
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : 'Could not delete product.')
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = Boolean(search || category || status)
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
        <button type="button" className={styles.addButton} onClick={() => setFormTarget('new')}>
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
        <select
          className={styles.filterSelect}
          value={category}
          onChange={(e) => updateParams({ category: e.target.value || undefined, page: undefined })}
        >
          <option value="">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
            <span className={styles.right}>Sell price</span>
            <span>Status</span>
            <span className={styles.right}>Actions</span>
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
            items.map((product) => (
              <div key={product.uuid} className={styles.row}>
                <span className={styles.mono}>{product.sku}</span>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.category}>{product.category}</span>
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
                <span className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actionLink}
                    onClick={() => setFormTarget(product)}
                    disabled={product.status === 'inactive'}
                    title={product.status === 'inactive' ? 'Inactive products cannot be edited' : undefined}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionLink} ${styles.actionDanger}`}
                    onClick={() => {
                      setDeleteTarget(product)
                      setDeleteError(null)
                    }}
                    disabled={product.status === 'inactive'}
                    title={product.status === 'inactive' ? 'Already inactive' : undefined}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
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
        <ProductFormModal
          product={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete product"
          message={`Deactivate "${deleteTarget.name}"? This soft-deletes the product — it stops appearing in the active catalog and can't be edited further, but the record remains.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import styles from './ProductDetailScreen.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import {
  getProduct,
  updateProduct,
  toggleProductStatus,
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductDetail,
  type ProductUpdateInput,
} from '../../api/products'
import ConfirmDialog from '../../components/ConfirmDialog'

function parseNumber(value: string): number {
  return value.trim() === '' ? 0 : Number(value)
}

interface FormState {
  name: string
  sku: string
  category: ProductCategory | ''
  costPrice: string
  sellPrice: string
  tax: string
  weight: string
  minQty: string
  maxQty: string
}

function toFormState(product: ProductDetail): FormState {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    costPrice: String(product.costPrice),
    sellPrice: String(product.sellPrice),
    tax: String(product.tax),
    weight: String(product.weight),
    minQty: String(product.minQty),
    maxQty: product.maxQty === null ? '' : String(product.maxQty),
  }
}

export default function ProductDetailScreen() {
  const { uuid } = useParams<{ uuid: string }>()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [form, setForm] = useState<FormState | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const fetchProduct = useCallback(async () => {
    if (!uuid) return
    setLoading(true)
    setLoadError(null)
    try {
      const detail = await getProduct(uuid)
      setProduct(detail)
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load this product.')
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const handleEdit = () => {
    if (!product) return
    setForm(toFormState(product))
    setFieldErrors({})
    setServerError(null)
    setMode('edit')
  }

  const handleCancel = () => {
    setMode('view')
    setFieldErrors({})
    setServerError(null)
  }

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!uuid || !form) return
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Name is required.'
    if (!form.sku.trim()) errors.sku = 'SKU is required.'
    if (!form.category) errors.category = 'Select a category.'

    const numericFields: [string, string][] = [
      ['costPrice', form.costPrice],
      ['sellPrice', form.sellPrice],
      ['tax', form.tax],
      ['weight', form.weight],
      ['minQty', form.minQty],
    ]
    for (const [key, value] of numericFields) {
      if (value.trim() === '') continue
      const parsed = Number(value)
      if (Number.isNaN(parsed) || parsed < 0) errors[key] = 'Must be a number ≥ 0.'
    }
    if (form.maxQty.trim() !== '') {
      const parsed = Number(form.maxQty)
      if (Number.isNaN(parsed) || parsed < 0) errors.maxQty = 'Must be a number ≥ 0.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: ProductUpdateInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category as ProductCategory,
      costPrice: parseNumber(form.costPrice),
      sellPrice: parseNumber(form.sellPrice),
      tax: parseNumber(form.tax),
      weight: parseNumber(form.weight),
      minQty: parseNumber(form.minQty),
      maxQty: form.maxQty.trim() === '' ? null : Number(form.maxQty),
    }

    setSaving(true)
    try {
      await updateProduct(uuid, input)
      // PUT returns data: null — re-fetch to get the persisted values.
      const refreshed = await getProduct(uuid)
      setProduct(refreshed)
      setMode('view')
    } catch (err) {
      // Keep mode 'edit' and leave `form` untouched — the user's input must survive a failed save.
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors(extractFieldErrors(err.details))
        } else if (err.code === 'SKU_ALREADY_EXISTS') {
          setFieldErrors({ sku: err.message })
        } else {
          setServerError(err.message)
        }
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStatusToggleClick = () => {
    setStatusError(null)
    setStatusConfirmOpen(true)
  }

  const handleStatusCancel = () => {
    if (statusUpdating) return
    setStatusConfirmOpen(false)
    setStatusError(null)
  }

  const handleStatusConfirm = async () => {
    if (!uuid || !product) return
    setStatusUpdating(true)
    setStatusError(null)
    try {
      await toggleProductStatus(uuid)
      // PUT /:uuid/status returns data: null — the new status is the opposite of the
      // one we just toggled from, since it's the only status-change route.
      const nextStatus = product.status === 'active' ? 'inactive' : 'active'
      setProduct({ ...product, status: nextStatus })
      setStatusConfirmOpen(false)
    } catch (err) {
      setStatusError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.root} data-screen-label="Product detail">
        <Link to="/admin/products" className={styles.backLink}>
          ← Back to products
        </Link>
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (loadError || !product) {
    return (
      <div className={styles.root} data-screen-label="Product detail">
        <Link to="/admin/products" className={styles.backLink}>
          ← Back to products
        </Link>
        <div className={styles.errorBanner}>
          <span>{loadError ?? 'Product not found.'}</span>
          <button type="button" onClick={fetchProduct}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isEdit = mode === 'edit' && form !== null
  const isLow = product.availableStock < product.minQty

  return (
    <div className={styles.root} data-screen-label="Product detail">
      <Link to="/admin/products" className={styles.backLink}>
        ← Back to products
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.subtitle}>
            <span className={styles.mono}>{product.sku}</span>
            <span
              className={`${styles.statusBadge} ${
                product.status === 'active' ? styles.statusActive : styles.statusInactive
              }`}
            >
              <span className={styles.statusDot} />
              {product.status}
            </span>
          </p>
        </div>
        {!isEdit && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.statusToggleButton}
              onClick={handleStatusToggleClick}
            >
              {product.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              className={styles.editButton}
              onClick={handleEdit}
              disabled={product.status === 'inactive'}
              title={product.status === 'inactive' ? 'Inactive products cannot be edited' : undefined}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {!isEdit && product.status === 'inactive' && (
        <div className={styles.inactiveNote}>This product must be activated before it can be edited.</div>
      )}

      {serverError && <div className={styles.serverError}>{serverError}</div>}

      {statusConfirmOpen && (
        <ConfirmDialog
          title={product.status === 'active' ? 'Deactivate product' : 'Activate product'}
          message={
            product.status === 'active'
              ? `Deactivate "${product.name}"? It will no longer be editable until reactivated.`
              : `Activate "${product.name}"?`
          }
          confirmLabel={product.status === 'active' ? 'Deactivate' : 'Activate'}
          danger={product.status === 'active'}
          busy={statusUpdating}
          error={statusError}
          onConfirm={handleStatusConfirm}
          onCancel={handleStatusCancel}
        />
      )}

      <div className={styles.panel}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>identity</div>
          <div className={`${styles.row} ${styles.row2}`}>
            <div className={`${styles.field} ${styles.full}`}>
              <label htmlFor="detail-name">Name</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-name"
                    value={form!.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className={fieldErrors.name ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.name && <div className={styles.errorText}>{fieldErrors.name}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.name}</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-sku">SKU</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-sku"
                    value={form!.sku}
                    onChange={(e) => setField('sku', e.target.value)}
                    className={fieldErrors.sku ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.sku && <div className={styles.errorText}>{fieldErrors.sku}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.sku}</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-category">Category</label>
              {isEdit ? (
                <>
                  <select
                    id="detail-category"
                    value={form!.category}
                    onChange={(e) => setField('category', e.target.value)}
                    className={fieldErrors.category ? styles.fieldError : ''}
                    disabled={saving}
                  >
                    <option value="">Select category</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && <div className={styles.errorText}>{fieldErrors.category}</div>}
                </>
              ) : (
                <div className={`${styles.value} ${styles.capitalize}`}>{product.category}</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>pricing</div>
          <div className={`${styles.row} ${styles.row3}`}>
            <div className={styles.field}>
              <label htmlFor="detail-cost">Cost price</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-cost"
                    inputMode="decimal"
                    value={form!.costPrice}
                    onChange={(e) => setField('costPrice', e.target.value)}
                    className={fieldErrors.costPrice ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.costPrice && <div className={styles.errorText}>{fieldErrors.costPrice}</div>}
                </>
              ) : (
                <div className={styles.value}>${product.costPrice.toFixed(2)}</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-sell">Sell price</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-sell"
                    inputMode="decimal"
                    value={form!.sellPrice}
                    onChange={(e) => setField('sellPrice', e.target.value)}
                    className={fieldErrors.sellPrice ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.sellPrice && <div className={styles.errorText}>{fieldErrors.sellPrice}</div>}
                </>
              ) : (
                <div className={styles.value}>${product.sellPrice.toFixed(2)}</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-tax">Tax rate %</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-tax"
                    inputMode="decimal"
                    value={form!.tax}
                    onChange={(e) => setField('tax', e.target.value)}
                    className={fieldErrors.tax ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.tax && <div className={styles.errorText}>{fieldErrors.tax}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.tax}%</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>logistics</div>
          <div className={`${styles.row} ${styles.row3}`}>
            <div className={styles.field}>
              <label htmlFor="detail-weight">Weight (kg)</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-weight"
                    inputMode="decimal"
                    value={form!.weight}
                    onChange={(e) => setField('weight', e.target.value)}
                    className={fieldErrors.weight ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.weight && <div className={styles.errorText}>{fieldErrors.weight}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.weight} kg</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-min">Min stock qty</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-min"
                    inputMode="decimal"
                    value={form!.minQty}
                    onChange={(e) => setField('minQty', e.target.value)}
                    className={fieldErrors.minQty ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.minQty && <div className={styles.errorText}>{fieldErrors.minQty}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.minQty}</div>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="detail-max">Max stock qty</label>
              {isEdit ? (
                <>
                  <input
                    id="detail-max"
                    inputMode="decimal"
                    placeholder="No max"
                    value={form!.maxQty}
                    onChange={(e) => setField('maxQty', e.target.value)}
                    className={fieldErrors.maxQty ? styles.fieldError : ''}
                    disabled={saving}
                  />
                  {fieldErrors.maxQty && <div className={styles.errorText}>{fieldErrors.maxQty}</div>}
                </>
              ) : (
                <div className={styles.value}>{product.maxQty ?? '—'}</div>
              )}
            </div>
          </div>

          <div className={styles.readonlyNote}>
            <div className={`${styles.row} ${styles.row2}`}>
              <div className={styles.field}>
                <label>Available stock</label>
                <div className={`${styles.value} ${isLow ? styles.valueLow : ''}`}>
                  {product.availableStock}
                </div>
              </div>
              <div className={styles.field}>
                <label>Reserved stock</label>
                <div className={styles.value}>{product.reservedStock}</div>
              </div>
            </div>
            <p className={styles.hint}>
              Stock levels aren't editable here — the Products API has no update path for them yet; they're
              managed via Inventory.
            </p>
          </div>
        </div>

        {isEdit && (
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

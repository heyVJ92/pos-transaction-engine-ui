import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import styles from './ProductFormModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import {
  createProduct,
  updateProduct,
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
  type ProductFormInput,
} from '../../api/products'

interface ProductFormModalProps {
  product?: Product
  onClose: () => void
  onSaved: () => void
}

function parseNumber(value: string): number {
  return value.trim() === '' ? 0 : Number(value)
}

export default function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = Boolean(product)

  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [category, setCategory] = useState<ProductCategory | ''>(product?.category ?? '')
  const [costPrice, setCostPrice] = useState(product ? String(product.costPrice) : '')
  const [sellPrice, setSellPrice] = useState(product ? String(product.sellPrice) : '')
  const [tax, setTax] = useState(product ? String(product.tax) : '')
  const [weight, setWeight] = useState(product ? String(product.weight) : '')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Name is required.'
    if (!sku.trim()) errors.sku = 'SKU is required.'
    if (!category) errors.category = 'Select a category.'

    const numericFields: [string, string][] = [
      ['costPrice', costPrice],
      ['sellPrice', sellPrice],
      ['tax', tax],
      ['weight', weight],
    ]
    for (const [key, value] of numericFields) {
      if (value.trim() === '') continue
      const parsed = Number(value)
      if (Number.isNaN(parsed) || parsed < 0) errors[key] = 'Must be a number ≥ 0.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: ProductFormInput = {
      name: name.trim(),
      sku: sku.trim(),
      category: category as ProductCategory,
      costPrice: parseNumber(costPrice),
      sellPrice: parseNumber(sellPrice),
      tax: parseNumber(tax),
      weight: parseNumber(weight),
    }

    setSubmitting(true)
    try {
      if (product) {
        await updateProduct(product.uuid, input)
      } else {
        await createProduct(input)
      }
      onSaved()
    } catch (err) {
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
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit product' : 'Add product'} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <div className={styles.section}>
          <div className={styles.sectionLabel}>identity</div>
          <div className={`${styles.row} ${styles.row2}`}>
            <div className={`${styles.field} ${styles.full}`}>
              <label htmlFor="product-name">Name</label>
              <input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldErrors.name ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.name && <div className={styles.errorText}>{fieldErrors.name}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-sku">SKU</label>
              <input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={fieldErrors.sku ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.sku && <div className={styles.errorText}>{fieldErrors.sku}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-category">Category</label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={fieldErrors.category ? styles.fieldError : ''}
                disabled={submitting}
              >
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.category && <div className={styles.errorText}>{fieldErrors.category}</div>}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>pricing &amp; logistics</div>
          <div className={`${styles.row} ${styles.row4}`}>
            <div className={styles.field}>
              <label htmlFor="product-cost">Cost price</label>
              <input
                id="product-cost"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={fieldErrors.costPrice ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.costPrice && <div className={styles.errorText}>{fieldErrors.costPrice}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-sell">Sell price</label>
              <input
                id="product-sell"
                inputMode="decimal"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className={fieldErrors.sellPrice ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.sellPrice && <div className={styles.errorText}>{fieldErrors.sellPrice}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-tax">Tax rate %</label>
              <input
                id="product-tax"
                inputMode="decimal"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className={fieldErrors.tax ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.tax && <div className={styles.errorText}>{fieldErrors.tax}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-weight">Weight (kg)</label>
              <input
                id="product-weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldErrors.weight ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.weight && <div className={styles.errorText}>{fieldErrors.weight}</div>}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

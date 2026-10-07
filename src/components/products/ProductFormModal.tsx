import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import Dropdown from '../Dropdown'
import styles from './ProductFormModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import { createProduct, PRODUCT_CATEGORIES, type ProductCategory, type ProductFormInput } from '../../api/products'

interface ProductFormModalProps {
  onClose: () => void
  onSaved: () => void
}

function parseNumber(value: string): number {
  return value.trim() === '' ? 0 : Number(value)
}

// Create-only — editing an existing product happens inline on ProductDetailScreen now, not here.
export default function ProductFormModal({ onClose, onSaved }: ProductFormModalProps) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [costPrice, setCostPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [tax, setTax] = useState('')
  const [weight, setWeight] = useState('')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sellBelowCost =
    costPrice.trim() !== '' &&
    sellPrice.trim() !== '' &&
    !Number.isNaN(Number(costPrice)) &&
    !Number.isNaN(Number(sellPrice)) &&
    Number(sellPrice) < Number(costPrice)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Name is required.'
    else if (name.trim().length > 255) errors.name = 'Must be 255 characters or fewer.'

    if (!sku.trim()) errors.sku = 'SKU is required.'
    else if (sku.trim().length > 50) errors.sku = 'Must be 50 characters or fewer.'

    if (!category) errors.category = 'Select a category.'

    const numericFields: [string, string][] = [
      ['costPrice', costPrice],
      ['sellPrice', sellPrice],
      ['weight', weight],
      ['minQty', minQty],
    ]
    for (const [key, value] of numericFields) {
      if (value.trim() === '') continue
      const parsed = Number(value)
      if (Number.isNaN(parsed) || parsed < 0) errors[key] = 'Must be a number ≥ 0.'
    }

    if (tax.trim() !== '') {
      const parsed = Number(tax)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) errors.tax = 'Must be between 0 and 100.'
    }

    if (maxQty.trim() !== '') {
      const parsed = Number(maxQty)
      if (Number.isNaN(parsed) || parsed < 0) errors.maxQty = 'Must be a number ≥ 0.'
      else if (minQty.trim() !== '' && !errors.minQty && parsed < Number(minQty)) {
        errors.maxQty = 'Max must be ≥ min.'
      }
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
      minQty: parseNumber(minQty),
      maxQty: maxQty.trim() === '' ? null : Number(maxQty),
    }

    setSubmitting(true)
    try {
      await createProduct(input)
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
    <Modal title="Add product" onClose={onClose} width={560}>
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
                placeholder="XXX-XXX-000"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={fieldErrors.sku ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.sku && <div className={styles.errorText}>{fieldErrors.sku}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-category">Category</label>
              <Dropdown
                id="product-category"
                className={styles.fieldDropdown}
                triggerClassName={styles.fieldDropdownTrigger}
                value={category}
                onChange={(v) => setCategory(v as ProductCategory)}
                error={!!fieldErrors.category}
                disabled={submitting}
                placeholder="Select category"
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
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
              {!fieldErrors.sellPrice && sellBelowCost && (
                <div className={styles.warningText}>Sell price is below cost price.</div>
              )}
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
          <div className={`${styles.row} ${styles.row2}`}>
            <div className={styles.field}>
              <label htmlFor="product-min-qty">Min stock qty</label>
              <input
                id="product-min-qty"
                inputMode="decimal"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className={fieldErrors.minQty ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.minQty && <div className={styles.errorText}>{fieldErrors.minQty}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="product-max-qty">Max stock qty</label>
              <input
                id="product-max-qty"
                inputMode="decimal"
                placeholder="No max"
                value={maxQty}
                onChange={(e) => setMaxQty(e.target.value)}
                className={fieldErrors.maxQty ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.maxQty && <div className={styles.errorText}>{fieldErrors.maxQty}</div>}
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

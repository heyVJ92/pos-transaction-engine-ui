import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import styles from './ProductFormModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import { restockInventory } from '../../api/inventory'

interface RestockModalProps {
  productUuid: string
  productName: string
  onClose: () => void
  onSaved: () => void
}

export default function RestockModal({ productUuid, productName, onClose, onSaved }: RestockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setServerError(null)

    const errors: Record<string, string> = {}
    const parsedQuantity = Number(quantity)
    if (quantity.trim() === '' || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      errors.quantity = 'Must be a number greater than 0.'
    }
    const parsedUnitCost = Number(unitCost)
    if (unitCost.trim() === '' || Number.isNaN(parsedUnitCost) || parsedUnitCost < 0) {
      errors.unitCost = 'Must be a number ≥ 0.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await restockInventory(productUuid, { quantity: parsedQuantity, unitCost: parsedUnitCost })
      onSaved()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors(extractFieldErrors(err.details))
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
    <Modal title={`Restock "${productName}"`} onClose={handleClose} width={420}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <div className={styles.section}>
          <div className={`${styles.row} ${styles.row2}`}>
            <div className={styles.field}>
              <label htmlFor="restock-quantity">Quantity</label>
              <input
                id="restock-quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldErrors.quantity ? styles.fieldError : ''}
                disabled={submitting}
                autoFocus
              />
              {fieldErrors.quantity && <div className={styles.errorText}>{fieldErrors.quantity}</div>}
            </div>
            <div className={styles.field}>
              <label htmlFor="restock-unit-cost">Unit cost</label>
              <input
                id="restock-unit-cost"
                inputMode="decimal"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className={fieldErrors.unitCost ? styles.fieldError : ''}
                disabled={submitting}
              />
              {fieldErrors.unitCost && <div className={styles.errorText}>{fieldErrors.unitCost}</div>}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={submitting}>
            Discard
          </button>
          <button type="submit" className={styles.saveButton} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import Modal from '../Modal'
import Dropdown from '../Dropdown'
import styles from './OpenSessionModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import { openCounterSession } from '../../api/counter-sessions'
import { listUsers, type User } from '../../api/users'
import type { Counter } from '../../api/counters'

interface OpenSessionModalProps {
  counter: Counter
  onClose: () => void
  onOpened: () => void
}

export default function OpenSessionModal({ counter, onClose, onOpened }: OpenSessionModalProps) {
  const [cashiers, setCashiers] = useState<User[]>([])
  const [loadingCashiers, setLoadingCashiers] = useState(true)
  const [cashiersError, setCashiersError] = useState<string | null>(null)

  const [cashierUuid, setCashierUuid] = useState('')
  const [openingCash, setOpeningCash] = useState('0')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Deferred a microtask so the setState calls below aren't synchronous within the effect
    // body (react-hooks/set-state-in-effect) — still resolves before paint, no visible delay.
    queueMicrotask(() => {
      if (cancelled) return
      setLoadingCashiers(true)
      setCashiersError(null)
      listUsers({ role: 'cashier', status: 'active', page: 1, limit: 50 })
        .then((result) => {
          if (cancelled) return
          setCashiers(result.items)
          setCashierUuid((prev) => prev || result.items[0]?.uuid || '')
        })
        .catch((err) => {
          if (cancelled) return
          setCashiersError(err instanceof ApiClientError ? err.message : 'Could not load cashiers.')
        })
        .finally(() => {
          if (!cancelled) setLoadingCashiers(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!cashierUuid) errors.cashierUuid = 'Select a cashier.'
    const parsedCash = Number(openingCash)
    if (openingCash.trim() === '' || Number.isNaN(parsedCash) || parsedCash < 0) {
      errors.openingCash = 'Must be a number ≥ 0.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await openCounterSession({
        counterUuid: counter.uuid,
        userUuid: cashierUuid,
        openingBalance: parsedCash,
      })
      onOpened()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors(extractFieldErrors(err.details))
        } else {
          // COUNTER_NOT_FOUND / COUNTER_INACTIVE / USER_NOT_FOUND all read fine as a plain message here
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
    <Modal title="Open counter" onClose={onClose} width={420}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <div className={styles.counterInfo}>
          <span className={styles.counterName}>{counter.name}</span>
          <span className={styles.counterCode}>{counter.code}</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="session-cashier">Cashier</label>
          {cashiersError ? (
            <div className={styles.errorText}>{cashiersError}</div>
          ) : (
            <Dropdown
              id="session-cashier"
              className={styles.fieldDropdown}
              triggerClassName={styles.fieldDropdownTrigger}
              value={cashierUuid}
              onChange={setCashierUuid}
              error={!!fieldErrors.cashierUuid}
              disabled={submitting || loadingCashiers || cashiers.length === 0}
              placeholder={loadingCashiers ? 'Loading…' : cashiers.length === 0 ? 'No active cashiers found' : undefined}
              options={cashiers.map((c) => ({ value: c.uuid, label: `${c.firstName} ${c.lastName}` }))}
            />
          )}
          {fieldErrors.cashierUuid && <div className={styles.errorText}>{fieldErrors.cashierUuid}</div>}
        </div>

        <div className={styles.field}>
          <label htmlFor="session-opening-cash">Opening cash</label>
          <input
            id="session-opening-cash"
            inputMode="decimal"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            className={fieldErrors.openingCash ? styles.fieldError : ''}
            disabled={submitting}
          />
          {fieldErrors.openingCash && <div className={styles.errorText}>{fieldErrors.openingCash}</div>}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={submitting || loadingCashiers}>
            {submitting ? 'Opening…' : 'Open counter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

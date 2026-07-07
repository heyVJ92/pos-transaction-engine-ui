import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import styles from './CounterFormModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import { createCounter, updateCounter, type Counter, type CounterFormInput } from '../../api/counters'

interface CounterFormModalProps {
  counter?: Counter
  onClose: () => void
  onSaved: () => void
}

export default function CounterFormModal({ counter, onClose, onSaved }: CounterFormModalProps) {
  const isEdit = Boolean(counter)

  const [name, setName] = useState(counter?.name ?? '')
  const [code, setCode] = useState(counter?.code ?? '')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Name is required.'
    if (!code.trim()) errors.code = 'Code is required.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: CounterFormInput = { name: name.trim(), code: code.trim() }

    setSubmitting(true)
    try {
      if (counter) {
        await updateCounter(counter.uuid, input)
      } else {
        await createCounter(input)
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'VALIDATION_ERROR') {
          setFieldErrors(extractFieldErrors(err.details))
        } else if (err.code === 'CODE_ALREADY_EXISTS') {
          setFieldErrors({ code: err.message })
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
    <Modal title={isEdit ? 'Edit counter' : 'Add counter'} onClose={onClose} width={420}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="counter-name">Name</label>
            <input
              id="counter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldErrors.name ? styles.fieldError : ''}
              disabled={submitting}
            />
            {fieldErrors.name && <div className={styles.errorText}>{fieldErrors.name}</div>}
          </div>
          <div className={styles.field}>
            <label htmlFor="counter-code">Code</label>
            <input
              id="counter-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={fieldErrors.code ? styles.fieldError : ''}
              disabled={submitting}
            />
            {fieldErrors.code && <div className={styles.errorText}>{fieldErrors.code}</div>}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save counter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import styles from './EditProfileModal.module.css'
import { ApiClientError, extractFieldErrors } from '../../api/client'
import { updateCurrentUser, type User } from '../../api/users'

interface EditProfileModalProps {
  user: User
  onClose: () => void
  onSaved: () => void
}

export default function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = 'First name is required.'
    if (!lastName.trim()) errors.lastName = 'Last name is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await updateCurrentUser({ firstName: firstName.trim(), lastName: lastName.trim() })
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
    <Modal title="Edit profile" onClose={onClose} width={420}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="edit-profile-first-name">First name</label>
            <input
              id="edit-profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={fieldErrors.firstName ? styles.fieldError : ''}
              disabled={submitting}
            />
            {fieldErrors.firstName && <div className={styles.errorText}>{fieldErrors.firstName}</div>}
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-profile-last-name">Last name</label>
            <input
              id="edit-profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={fieldErrors.lastName ? styles.fieldError : ''}
              disabled={submitting}
            />
            {fieldErrors.lastName && <div className={styles.errorText}>{fieldErrors.lastName}</div>}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

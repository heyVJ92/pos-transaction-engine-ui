import { useEffect, useRef, useState } from 'react'
import styles from './Dropdown.module.css'
import NavIcon from './NavIcon'

export interface DropdownOption {
  value: string
  label: string
}

// Only one Dropdown menu should be open at a time (matches native <select> behavior, where
// opening one closes any other). Each open instance registers a closer here so a newly-opened
// Dropdown can call the previous one's closer before opening itself.
let closeOpenDropdown: (() => void) | null = null

interface DropdownProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  error?: boolean
  ariaLabel?: string
  className?: string
  triggerClassName?: string
}

export default function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  ariaLabel,
  className,
  triggerClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const closeSelf = useRef(() => setOpen(false))

  useEffect(() => {
    if (!open) return
    const closer = closeSelf.current
    closeOpenDropdown = closer
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      if (closeOpenDropdown === closer) closeOpenDropdown = null
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const selected = options.find((o) => o.value === value)
  const triggerLabel = selected?.label ?? placeholder ?? ''

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`${styles.trigger} ${error ? styles.error : ''} ${triggerClassName ?? ''}`}
        onClick={() => {
          if (!open) closeOpenDropdown?.()
          setOpen((o) => !o)
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          <NavIcon name="chevron-down" size={14} />
        </span>
      </button>

      {open && (
        <div className={styles.menu} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`${styles.option} ${option.value === value ? styles.optionSelected : ''}`}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

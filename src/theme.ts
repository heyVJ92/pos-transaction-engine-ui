import { useState, type CSSProperties } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'tender.theme'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'light'
  } catch {
    return 'light'
  }
}

// Persisted in localStorage (unlike the session token) — a display preference should survive
// tab close/reopen and refresh, not disappear with the session.
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // localStorage unavailable (e.g. private mode) — theme just won't survive a refresh.
    }
  }

  return [theme, setTheme]
}

export const THEMES: Record<Theme, CSSProperties> = {
  light: {
    '--bg': '#fbfbfb',
    '--surface': '#ffffff',
    '--hover': '#f6f6f7',
    '--track': '#f1f1f2',
    '--border': 'rgba(24,24,27,0.10)',
    '--border-strong': 'rgba(24,24,27,0.16)',
    '--text': '#18181b',
    '--text-2': '#52525b',
    '--text-3': '#a1a1aa',
    '--accent': '#2f6bf6',
    '--accent-bg': 'rgba(47,107,246,0.10)',
    '--mark-shadow': 'rgba(24,24,27,0.05)',
    '--pending-tint': 'rgba(24,24,27,0.05)',
    '--pending-text': '#52525b',
    '--pending-dot': '#a1a1aa',
  } as CSSProperties,
  dark: {
    '--bg': '#09090b',
    '--surface': '#111114',
    '--hover': '#17171b',
    '--track': '#161619',
    '--border': 'rgba(255,255,255,0.10)',
    '--border-strong': 'rgba(255,255,255,0.18)',
    '--text': '#fafafa',
    '--text-2': '#a1a1aa',
    '--text-3': '#6b6b74',
    '--accent': '#4d86ff',
    '--accent-bg': 'rgba(77,134,255,0.14)',
    '--mark-shadow': 'rgba(0,0,0,0.4)',
    '--pending-tint': 'rgba(255,255,255,0.06)',
    '--pending-text': '#a1a1aa',
    '--pending-dot': '#6b6b74',
  } as CSSProperties,
}

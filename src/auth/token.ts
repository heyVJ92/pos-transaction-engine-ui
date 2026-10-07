// localStorage for the JWT access token, plus a client-side decode of its payload.
//
// Deliberately localStorage, not sessionStorage: staff commonly open new tabs (Alt+Enter, new
// tab + paste URL) rather than literal tab-duplication, and only localStorage is visible there.
// Trade-off: the session now outlives the tab and survives a browser restart — it ends only on
// token expiry (`isExpired` below) or explicit logout, not on tab close. See docs/decisions.md.
//
// The decode below is NOT a verification — it just reads the base64url-encoded payload to get
// `role` for UI routing. stockapi verifies the signature on every real request
// (`requireAuth` middleware); nothing here is trusted for access control.

const TOKEN_KEY = 'tender.accessToken'

export type Role = 'admin' | 'cashier'

const VALID_ROLES: readonly string[] = ['admin', 'cashier']

interface TokenPayload {
  sub: string
  role: Role
  exp: number
  iat?: number
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // localStorage unavailable (e.g. private mode) — session just won't survive a refresh.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to clean up if storage isn't available
  }
}

function decodePayload(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const unpadded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // JWT base64url segments carry no padding — atob requires a length that's a multiple of 4.
    const base64 = unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as TokenPayload
  } catch {
    return null
  }
}

export function decodeRole(token: string): Role | null {
  // decodePayload only checks the token is well-formed base64url JSON — it never validates that
  // `role` is actually one of the known values. A malformed/unexpected payload must not leak a
  // garbage string into UI code that trusts `Role` and indexes a lookup table with it.
  const role = decodePayload(token)?.role
  return role !== undefined && VALID_ROLES.includes(role) ? role : null
}

export function isExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}

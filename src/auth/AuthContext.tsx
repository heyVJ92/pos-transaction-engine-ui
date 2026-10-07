import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../api/client'
import { login as loginRequest } from '../api/auth'
import { clearToken, decodeRole, getToken, isExpired, setToken } from './token'
import { AuthContext } from './context'

// A stored token past its exp claim is treated as absent — same effect as never having logged in.
function readValidToken(): string | null {
  const token = getToken()
  if (!token || isExpired(token)) {
    if (token) clearToken()
    return null
  }
  return token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => readValidToken())

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await loginRequest(email, password)
    const role = decodeRole(accessToken)
    if (!role) {
      // Shouldn't happen against a real stockapi token, but fail loudly rather than silently
      // logging someone in with no role to route on.
      throw new Error('Login succeeded but the session token had no role — cannot continue.')
    }
    setToken(accessToken)
    setTokenState(accessToken)
    return role
  }, [])

  const role = token ? decodeRole(token) : null

  return <AuthContext.Provider value={{ token, role, login, logout }}>{children}</AuthContext.Provider>
}

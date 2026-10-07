import { createContext } from 'react'
import type { Role } from './token'

export interface AuthContextValue {
  token: string | null
  role: Role | null
  login: (email: string, password: string) => Promise<Role>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

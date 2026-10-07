import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

// Wraps a route subtree — redirects to the login screen if there's no valid (unexpired) token.
// AuthContext already treats an expired stored token as absent, so this only checks presence.
export default function RequireAuth() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/" replace />
  return <Outlet />
}

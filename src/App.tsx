import AppRoutes from './routes'
import { AuthProvider } from './auth/AuthContext'

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App

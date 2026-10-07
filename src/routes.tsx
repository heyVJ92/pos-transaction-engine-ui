import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginScreen from './screens/LoginScreen'
import type { Role } from './auth/token'
import RequireAuth from './auth/RequireAuth'
import { useAuth } from './auth/useAuth'
import AdminLayout from './layouts/AdminLayout'
import CashierLayout from './layouts/CashierLayout'
import BlockedScreen from './components/BlockedScreen'
import ProductsListScreen from './screens/products/ProductsListScreen'
import ProductDetailScreen from './screens/products/ProductDetailScreen'
import CountersListScreen from './screens/counters/CountersListScreen'
import CashierCountersScreen from './screens/counters/CashierCountersScreen'
import RegisterScreen from './screens/register/RegisterScreen'
import InventoryScreen from './screens/inventory/InventoryScreen'
import OrdersListScreen from './screens/orders/OrdersListScreen'
import OrderDetailScreen from './screens/orders/OrderDetailScreen'
import PaymentScreen from './screens/payment/PaymentScreen'
import SettingsScreen from './screens/settings/SettingsScreen'

function LoginRoute() {
  const navigate = useNavigate()
  const { token, role } = useAuth()

  // A valid session already exists (e.g. this tab was duplicated from an authenticated one) —
  // skip the form instead of making the user log in again.
  if (token && role) {
    return <Navigate to={role === 'admin' ? '/admin/overview' : '/cashier/counters'} replace />
  }

  const handleLoginSuccess = (loggedInRole: Role) => {
    navigate(loggedInRole === 'admin' ? '/admin/overview' : '/cashier/counters', { replace: true })
  }
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginRoute />} />

      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route
            path="overview"
            element={
              <BlockedScreen
                title="Overview"
                reason="Not built yet — planned as a hybrid dashboard (real product/counter counts, blocked cards for order-based metrics)."
                docsHint="docs/screens.md"
              />
            }
          />
          <Route path="products" element={<ProductsListScreen />} />
          <Route path="products/:uuid" element={<ProductDetailScreen />} />
          <Route path="inventory" element={<InventoryScreen />} />
          <Route path="orders" element={<OrdersListScreen />} />
          <Route
            path="orders/new"
            element={
              <BlockedScreen
                title="Place order"
                reason="Not built yet — needs a full catalog + cart + confirm flow on top of POST /orders and the add-item endpoint, separate from Register's cart. Not part of the Orders list wiring pass."
                docsHint="docs/integration-todo.md"
              />
            }
          />
          <Route path="orders/:uuid" element={<OrderDetailScreen />} />
          <Route path="counters" element={<CountersListScreen />} />
          <Route path="counters/:uuid/register" element={<RegisterScreen />} />
          <Route path="counters/:uuid/payment" element={<PaymentScreen />} />
          <Route
            path="audit"
            element={<BlockedScreen title="Audit log" reason="Blocked — no audit_logs migration or API exists at all yet." docsHint="docs/api-reference.md#known-gaps--drift-from-the-prd" />}
          />
          <Route
            path="demo"
            element={<BlockedScreen title="Concurrency demo" reason="Blocked — needs a working Orders API to demonstrate locking behavior." docsHint="docs/api-reference.md#known-gaps--drift-from-the-prd" />}
          />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

        <Route path="/cashier" element={<CashierLayout />}>
          <Route index element={<Navigate to="counters" replace />} />
          <Route path="counters" element={<CashierCountersScreen />} />
          <Route path="counters/:uuid/register" element={<RegisterScreen />} />
          <Route path="counters/:uuid/payment" element={<PaymentScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<BlockedScreen title="Not found" reason="This route doesn't exist." />} />
    </Routes>
  )
}

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import EntryScreen, { type Role } from './screens/EntryScreen'
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

function EntryRoute() {
  const navigate = useNavigate()
  const handleSelectRole = (role: Role) => navigate(`/${role}`)
  return <EntryScreen onSelectRole={handleSelectRole} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<EntryRoute />} />

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
      </Route>

      <Route path="/cashier" element={<CashierLayout />}>
        <Route index element={<Navigate to="counters" replace />} />
        <Route path="counters" element={<CashierCountersScreen />} />
        <Route path="counters/:uuid/register" element={<RegisterScreen />} />
        <Route path="counters/:uuid/payment" element={<PaymentScreen />} />
      </Route>

      <Route path="*" element={<BlockedScreen title="Not found" reason="This route doesn't exist." />} />
    </Routes>
  )
}

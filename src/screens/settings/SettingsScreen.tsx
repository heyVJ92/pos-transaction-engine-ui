import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './SettingsScreen.module.css'
import { useAuth } from '../../auth/useAuth'
import type { Role } from '../../auth/token'
import { ApiClientError } from '../../api/client'
import { getCurrentUser, type User } from '../../api/users'
import { listOrders, type Order, type OrderStatus } from '../../api/orders'
import EditProfileModal from '../../components/settings/EditProfileModal'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', cashier: 'Cashier' }

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'draft',
  in_process: 'in process',
  hold: 'hold',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired',
}

function initials(user: User): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

function formatMemberSince(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatOrderDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Sketch only — none of these have a backend source yet (no per-user order/sales aggregation
// exists in stockapi). Shown as "—" with a "not wired yet" tag rather than fabricated numbers.
// Labels are a first guess at what'd actually be useful for POS staff; revisit once there's a
// real endpoint to back any of them.
const STAT_PLACEHOLDERS = [
  { label: 'Orders handled' },
  { label: 'Sales processed' },
  { label: 'Avg. transaction' },
  { label: 'Hours this week' },
]

export default function SettingsScreen() {
  const { role } = useAuth()
  const backTo = role === 'cashier' ? '/cashier/counters' : '/admin/products'
  const backLabel = role === 'cashier' ? '← Back to counters' : '← Back to products'

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const [recentOrders, setRecentOrders] = useState<Order[] | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const current = await getCurrentUser()
      setUser(current)
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Deferred a microtask so the call isn't a synchronous setState within the effect body
    // (react-hooks/set-state-in-effect) — matches the pattern already used in ProductDetailScreen.
    queueMicrotask(fetchUser)
  }, [fetchUser])

  // `GET /orders` has no userId/uuid filter — `userName` does a partial, case-insensitive match
  // against the full name server-side. Real data (actual matching orders), just not a precise
  // per-account filter; two staff sharing an identical full name would both match. See
  // docs/integration-todo.md.
  const fetchRecentOrders = useCallback(async (fullName: string) => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const result = await listOrders({ userName: fullName, page: 1, limit: 5 })
      setRecentOrders(result.items)
    } catch (err) {
      setOrdersError(err instanceof ApiClientError ? err.message : 'Could not load recent orders.')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    queueMicrotask(() => fetchRecentOrders(`${user.firstName} ${user.lastName}`))
  }, [user, fetchRecentOrders])

  const handleProfileSaved = () => {
    setEditOpen(false)
    fetchUser()
  }

  if (loading) {
    return (
      <div className={styles.root} data-screen-label="Settings">
        <Link to={backTo} className={styles.backLink}>
          {backLabel}
        </Link>
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (loadError || !user) {
    return (
      <div className={styles.root} data-screen-label="Settings">
        <Link to={backTo} className={styles.backLink}>
          {backLabel}
        </Link>
        <div className={styles.errorBanner}>
          <span>{loadError ?? 'Could not load your profile.'}</span>
          <button type="button" onClick={fetchUser}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root} data-screen-label="Settings">
      <Link to={backTo} className={styles.backLink}>
        {backLabel}
      </Link>

      <div className={styles.profileHeaderCard}>
        <div className={styles.profileInfoRow}>
          <div className={styles.profileAvatarLarge}>{initials(user)}</div>
          <div className={styles.profileInfoText}>
            <div className={styles.profileName}>
              {user.firstName} {user.lastName}
            </div>
            <div className={styles.profileMeta}>
              <span>{role ? ROLE_LABEL[role] : '—'}</span>
              <span className={styles.profileMetaDot}>·</span>
              <span>{user.email}</span>
            </div>
          </div>
          <button type="button" className={styles.editProfileButton} onClick={() => setEditOpen(true)}>
            Edit profile
          </button>
        </div>
      </div>

      <div className={styles.statsRow}>
        {STAT_PLACEHOLDERS.map((stat) => (
          <div key={stat.label} className={styles.statTile}>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statBadge}>not wired yet</div>
          </div>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.splitGrid}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>recent orders</div>

            {ordersLoading && <div className={styles.ordersSkeleton} />}

            {!ordersLoading && ordersError && (
              <div className={styles.errorBanner}>
                <span>{ordersError}</span>
                <button type="button" onClick={() => fetchRecentOrders(`${user.firstName} ${user.lastName}`)}>
                  Retry
                </button>
              </div>
            )}

            {!ordersLoading && !ordersError && recentOrders !== null && recentOrders.length === 0 && (
              <p className={styles.hint}>No orders yet.</p>
            )}

            {!ordersLoading && !ordersError && recentOrders !== null && recentOrders.length > 0 && (
              <div className={styles.ordersList}>
                {recentOrders.map((order) => (
                  <div key={order.uuid} className={styles.orderRow}>
                    <div className={styles.orderRowMain}>
                      <span className={styles.orderNumber}>#{order.orderNumber}</span>
                      <span className={styles.orderDate}>{formatOrderDate(order.updatedAt)}</span>
                    </div>
                    <div className={styles.orderRowMeta}>
                      <span
                        className={`${styles.orderStatusBadge} ${styles[`status_${order.status}`] ?? ''}`}
                      >
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className={styles.orderTotal}>${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className={styles.hint}>
              Matched by name against <code>GET /orders</code> — not a precise per-account filter yet
              (no userId filter exists on that endpoint).
            </p>
          </div>

          <div className={styles.idCardSection}>
            <div className={styles.sectionLabel}>id card</div>
            <div className={styles.idCard}>
              <div className={styles.idCardBand}>
                {/* "Tender" is the app's own brand — swaps to a real per-store name later, once
                    that's a field on the user/store model. Not wired to anything yet. */}
                <span className={styles.idCardBrand}>Tender</span>
                <div className={styles.idCardAccent} />
              </div>

              <div className={styles.idCardBody}>
                <div className={styles.idCardPhoto}>{initials(user)}</div>
                <div className={styles.idCardName}>
                  {user.firstName} {user.lastName}
                </div>
                <div className={styles.idCardRoleLine}>{role ? ROLE_LABEL[role].toUpperCase() : '—'}</div>

                <div className={styles.idCardDetails}>
                  <div className={styles.idCardDetailRow}>
                    <span className={styles.idCardDetailLabel}>ID No</span>
                    <span className={styles.idCardDetailValue}>{user.uuid.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className={styles.idCardDetailRow}>
                    <span className={styles.idCardDetailLabel}>Member since</span>
                    <span className={styles.idCardDetailValue}>{formatMemberSince(user.createdAt)}</span>
                  </div>
                  <div className={styles.idCardDetailRow}>
                    <span className={styles.idCardDetailLabel}>Email</span>
                    <span className={styles.idCardDetailValue}>{user.email}</span>
                  </div>
                </div>
              </div>

              <div className={styles.idCardBandBottom}>
                <div className={styles.idCardAccentBottom} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditProfileModal user={user} onClose={() => setEditOpen(false)} onSaved={handleProfileSaved} />
      )}
    </div>
  )
}

import { apiRequest, type ApiMeta } from './client'

export type UserRole = 'admin' | 'cashier'
export type UserStatus = 'active' | 'inactive'

export interface User {
  uuid: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface ListUsersParams {
  role?: UserRole
  status?: UserStatus
  search?: string
  page: number
  limit: number
  sort?: 'created_at' | 'first_name' | 'last_name' | 'email'
  order?: 'asc' | 'desc'
}

export interface ListUsersResult {
  items: User[]
  meta: ApiMeta
}

export async function listUsers(params: ListUsersParams): Promise<ListUsersResult> {
  const query = new URLSearchParams()
  if (params.role) query.set('role', params.role)
  if (params.status) query.set('status', params.status)
  if (params.search) query.set('search', params.search)
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<User[]>(`/users?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

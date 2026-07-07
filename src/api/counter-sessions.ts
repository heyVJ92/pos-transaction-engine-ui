import { apiRequest, type ApiMeta } from './client'

export type CounterSessionStatus = 'open' | 'closed'

export interface CounterSession {
  uuid: string
  counter: { uuid: string; name: string; code: string }
  cashier: { uuid: string; firstName: string; lastName: string }
  openingBalance: number
  closingBalance: number | null
  totalOrders: number
  totalAmount: number
  status: CounterSessionStatus
  openedAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListCounterSessionsParams {
  counterUuid?: string
  userUuid?: string
  status?: CounterSessionStatus
  page: number
  limit: number
  sort?: 'opened_at' | 'closed_at'
  order?: 'asc' | 'desc'
}

export interface ListCounterSessionsResult {
  items: CounterSession[]
  meta: ApiMeta
}

export async function listCounterSessions(params: ListCounterSessionsParams): Promise<ListCounterSessionsResult> {
  const query = new URLSearchParams()
  if (params.counterUuid) query.set('counterUuid', params.counterUuid)
  if (params.userUuid) query.set('userUuid', params.userUuid)
  if (params.status) query.set('status', params.status)
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<CounterSession[]>(`/counter-sessions?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export interface OpenCounterSessionInput {
  counterUuid: string
  userUuid: string
  openingBalance: number
}

export async function openCounterSession(input: OpenCounterSessionInput): Promise<void> {
  await apiRequest<null>('/counter-sessions', { method: 'POST', body: JSON.stringify(input) })
}

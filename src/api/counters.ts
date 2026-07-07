import { apiRequest, type ApiMeta } from './client'

export type CounterStatus = 'active' | 'inactive'

export interface Counter {
  uuid: string
  name: string
  code: string
  status: CounterStatus
  createdAt: string
  updatedAt: string
}

export interface ListCountersParams {
  search?: string
  status?: CounterStatus
  page: number
  limit: number
  sort?: 'name' | 'code'
  order?: 'asc' | 'desc'
}

export interface ListCountersResult {
  items: Counter[]
  meta: ApiMeta
}

export async function listCounters(params: ListCountersParams): Promise<ListCountersResult> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<Counter[]>(`/counters?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export interface CounterFormInput {
  name: string
  code: string
}

export async function createCounter(input: CounterFormInput): Promise<void> {
  await apiRequest<null>('/counters', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateCounter(uuid: string, input: Partial<CounterFormInput>): Promise<void> {
  await apiRequest<null>(`/counters/${uuid}`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function deactivateCounter(uuid: string): Promise<void> {
  // soft delete — server rejects with ALREADY_INACTIVE (409) if the counter is already inactive.
  await apiRequest<null>(`/counters/${uuid}`, { method: 'DELETE' })
}

export async function reactivateCounter(uuid: string): Promise<void> {
  // status:"active" is the one PUT body the server accepts on an inactive counter (2026-07-04 addition
  // to stockapi — see docs/decisions.md). Any other field alongside it still requires the row to
  // already be active, per the server's guard.
  await apiRequest<null>(`/counters/${uuid}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) })
}

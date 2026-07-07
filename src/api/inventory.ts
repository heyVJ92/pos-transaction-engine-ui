import { apiRequest, type ApiMeta } from './client'
import type { ProductCategory, ProductStatus } from './products'

export interface InventoryItem {
  uuid: string
  product: {
    uuid: string
    name: string
    sku: string
    category: ProductCategory
    costPrice: number
    sellPrice: number
    tax: number
    weight: number
    status: ProductStatus
  }
  availableStock: number
  reservedStock: number
  createdAt: string
  updatedAt: string
}

export interface ListInventoryParams {
  category?: ProductCategory
  search?: string
  page: number
  limit: number
  sort?: 'name' | 'category' | 'cost_price' | 'sell_price'
  order?: 'asc' | 'desc'
}

export interface ListInventoryResult {
  items: InventoryItem[]
  meta: ApiMeta
}

// Matches the real, committed `GET /inventory` — see docs/api-reference.md#inventory. Not called yet;
// InventoryScreen runs on local mock data until wiring is confirmed (docs/decisions.md, 2026-07-04).
export async function listInventory(params: ListInventoryParams): Promise<ListInventoryResult> {
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.search) query.set('search', params.search)
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<InventoryItem[]>(`/inventory?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export interface AddInventoryInput {
  product_uuid: string // snake_case — matches postInventoryBodySchema, the one inconsistent schema
  availableStock: number
}

export async function addInventory(input: AddInventoryInput): Promise<void> {
  await apiRequest<null>('/inventory', { method: 'POST', body: JSON.stringify(input) })
}

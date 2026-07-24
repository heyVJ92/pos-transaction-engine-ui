import { apiRequest, type ApiMeta } from './client'

export type MovementType = 'initial' | 'reserved' | 'confirmed' | 'reverted' | 'expired' | 'restock'

// IInventoryMovementPublic — GET /inventory/:product_uuid/movements. No `note`/running-reserved
// fields exist server-side; only stockBefore/stockAfter (available stock) are tracked per movement.
export interface InventoryMovement {
  uuid: string
  productUuid: string
  orderUuid: string | null
  orderNumber: string | null
  quantity: number
  movementType: MovementType
  stockBefore: number
  stockAfter: number
  unitCost: number | null
  createdAt: string
}

export interface ListInventoryMovementsParams {
  page: number
  limit: number
  order?: 'asc' | 'desc'
  movementType?: MovementType
  startDate?: string
  endDate?: string
}

export interface ListInventoryMovementsResult {
  items: InventoryMovement[]
  meta: ApiMeta
}

// Query params match the live `inventoryMovementQuerySchema` (inventory.schema.ts) — startDate,
// endDate, page, limit, order, movementType. There is no `sort` param: the repository always
// orders by IM.created_at, `order` only controls asc/desc.
export async function listInventoryMovements(
  productUuid: string,
  params: ListInventoryMovementsParams,
): Promise<ListInventoryMovementsResult> {
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.order) query.set('order', params.order)
  if (params.movementType) query.set('movementType', params.movementType)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)

  const { data, meta } = await apiRequest<InventoryMovement[]>(
    `/inventory/${productUuid}/movements?${query.toString()}`,
  )
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}


// PUT /inventory/:product_uuid/restock — matches the live restockBodySchema (quantity, unitCost).
// Response has data: null, so the caller must re-GET the product to see the new stock level.
export interface RestockInput {
  quantity: number
  unitCost: number
}

export async function restockInventory(productUuid: string, input: RestockInput): Promise<void> {
  await apiRequest<null>(`/inventory/${productUuid}/restock`, { method: 'PUT', body: JSON.stringify(input) })
}

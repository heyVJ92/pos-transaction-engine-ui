import { apiRequest, type ApiMeta } from './client'

export type OrderStatus = 'draft' | 'in_process' | 'hold' | 'completed' | 'cancelled' | 'expired'

// list shape (GET /orders) — no `status` filter param exists yet (schema is `.strict()`, rejects
// unknown params) and no item data is included (only GET /orders/:uuid detail has that).
export interface Order {
  uuid: string
  cashier: { uuid: string; firstName: string; lastName: string }
  counter: { uuid: string; name: string; code: string }
  orderNumber: string
  discount: number
  subTotal: number
  tax: number
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface ListOrdersParams {
  search?: string
  status?: OrderStatus
  // Partial, case-insensitive match against `CONCAT(first_name, ' ', last_name)` server-side —
  // not an exact userId/uuid filter (the schema has none). Two staff sharing an identical full
  // name would both match; acceptable for "recent orders by me" until a real userId filter exists.
  userName?: string
  page: number
  limit: number
}

export interface ListOrdersResult {
  items: Order[]
  meta: ApiMeta
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.userName) query.set('userName', params.userName)
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))

  const { data, meta } = await apiRequest<Order[]>(`/orders?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export interface OrderItem {
  uuid: string
  quantity: number
  sellPrice: number
  costPrice: number
  tax: number
  total: number
  product: { uuid: string; name: string; sku: string }
}

export interface OrderDetail extends Order {
  items: OrderItem[]
}

export async function getOrder(uuid: string): Promise<OrderDetail> {
  const { data } = await apiRequest<OrderDetail>(`/orders/${uuid}`)
  return data
}

export interface CreateOrderInput {
  sessionUuid: string
}

export interface CreateOrderResult {
  uuid: string
  orderNumber: string
  status: OrderStatus
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { data } = await apiRequest<CreateOrderResult>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data
}

export interface AddOrderItemInput {
  productUuid: string
  quantity: number
}

// `total` (line-item total) is deliberately omitted here — the live endpoint doesn't populate it
// (known backend bug, see docs/api-reference.md#orders--orders). Use `orderTotal` instead.
export interface AddOrderItemResult {
  uuid: string
  productName: string
  sku: string
  quantity: number
  sellPrice: number
  costPrice: number
  tax: number
  subTotal: number
  orderTotal: number
  orderUuid: string
}

export async function addOrderItem(orderUuid: string, input: AddOrderItemInput): Promise<AddOrderItemResult> {
  const { data } = await apiRequest<AddOrderItemResult>(`/orders/${orderUuid}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data
}

export interface RemoveOrderItemResult {
  uuid: string
  productName: string
  sku: string
  quantity: number
  orderUuid: string
  subTotal: number
  tax: number
  orderTotal: number
}

export async function removeOrderItem(orderUuid: string, itemUuid: string): Promise<RemoveOrderItemResult> {
  const { data } = await apiRequest<RemoveOrderItemResult>(`/orders/${orderUuid}/items/${itemUuid}`, {
    method: 'DELETE',
  })
  return data
}

export interface HoldOrderResult {
  uuid: string
  status: OrderStatus
}

export async function holdOrder(orderUuid: string): Promise<HoldOrderResult> {
  const { data } = await apiRequest<HoldOrderResult>(`/orders/${orderUuid}/hold`, {
    method: 'PATCH',
  })
  return data
}

// backend returns `data: null` on success — nothing to hand back to the caller
export async function cancelOrder(orderUuid: string): Promise<void> {
  await apiRequest<null>(`/orders/${orderUuid}/cancel`, {
    method: 'PATCH',
  })
}

export interface EditOrderItemInput {
  quantity: number
}

// quantity 0 means the line was removed — the backend omits sellPrice/costPrice
// entirely on that response, so their absence is how the caller can tell without
// a separate discriminant field (apiRequest only exposes `data`, not the message text)
export interface EditOrderItemResult {
  uuid: string
  productName: string
  sku: string
  quantity: number
  sellPrice?: number
  costPrice?: number
  orderUuid: string
  subTotal: number
  tax: number
  orderTotal: number
}

export async function editOrderItem(
  orderUuid: string,
  itemUuid: string,
  input: EditOrderItemInput,
): Promise<EditOrderItemResult> {
  const { data } = await apiRequest<EditOrderItemResult>(`/orders/${orderUuid}/items/${itemUuid}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data
}

export interface CheckoutOrderResult {
  uuid: string
  status: OrderStatus
}

export async function checkoutOrder(orderUuid: string): Promise<CheckoutOrderResult> {
  const { data } = await apiRequest<CheckoutOrderResult>(`/orders/${orderUuid}/checkout`, {
    method: 'PATCH',
  })
  return data
}

export type PaymentMode = 'cash' | 'card' | 'upi'

export interface PayOrderInput {
  mode: PaymentMode
  amountTendered: number
}

export interface PayOrderResult {
  orderUuid: string
  orderStatus: OrderStatus
  payment: {
    uuid: string
    mode: PaymentMode
    amount: number
    amountTendered: number
    change: number
  }
}

// `idempotencyKey` is required by the backend (400 IDEMPOTENCY_KEY_REQUIRED without it) — generated
// caller-side (one per payment attempt), not here, so the caller controls when a new attempt starts.
export async function payOrder(
  orderUuid: string,
  input: PayOrderInput,
  idempotencyKey: string,
): Promise<PayOrderResult> {
  const { data } = await apiRequest<PayOrderResult>(`/orders/${orderUuid}/payment`, {
    method: 'PATCH',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
  return data
}

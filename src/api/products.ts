import { apiRequest, type ApiMeta } from './client'

export type ProductCategory = 'beverages' | 'snacks' | 'grocery' | 'dairy' | 'others'
export type ProductStatus = 'active' | 'inactive'

export const PRODUCT_CATEGORIES: ProductCategory[] = ['beverages', 'snacks', 'grocery', 'dairy', 'others']

// list shape (GET /products) — carries tax and stock fields (joined from inventory), but not weight.
// Verified directly against the live endpoint — docs/api-reference.md's "no tax/weight on list" claim
// is stale; only `weight` actually moved to the detail-only shape.
export interface Product {
  uuid: string
  name: string
  sku: string
  category: ProductCategory
  costPrice: number
  sellPrice: number
  tax: number
  availableStock: number
  reservedStock: number
  minQty: number
  maxQty: number | null
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

// detail shape (GET /products/:uuid) — everything in the list model, plus weight
export interface ProductDetail extends Product {
  weight: number
}

export interface ListProductsParams {
  search?: string
  category?: ProductCategory
  status?: ProductStatus
  lowStock?: boolean
  page: number
  limit: number
  sort?: 'name' | 'category' | 'cost_price' | 'sell_price' | 'available_stock'
  order?: 'asc' | 'desc'
}

export interface ListProductsResult {
  items: Product[]
  meta: ApiMeta
}

export async function listProducts(params: ListProductsParams): Promise<ListProductsResult> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.category) query.set('category', params.category)
  if (params.status) query.set('status', params.status)
  if (params.lowStock) query.set('lowStock', 'true')
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<Product[]>(`/products?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export async function getProduct(uuid: string): Promise<ProductDetail> {
  const { data } = await apiRequest<ProductDetail>(`/products/${uuid}`)
  return data
}

export interface ProductFormInput {
  name: string
  sku: string
  category: ProductCategory
  weight: number
  costPrice: number
  sellPrice: number
  tax: number
  minQty: number
  maxQty: number | null
}

export async function createProduct(input: ProductFormInput): Promise<void> {
  await apiRequest<null>('/products', { method: 'POST', body: JSON.stringify(input) })
}

// PUT accepts minQty/maxQty (confirmed against the live updateProductBodySchema) but not
// availableStock — stock levels have no update path via this API.
export interface ProductUpdateInput {
  name: string
  sku: string
  category: ProductCategory
  costPrice: number
  sellPrice: number
  tax: number
  weight: number
  minQty: number
  maxQty: number | null
}

export async function updateProduct(uuid: string, input: ProductUpdateInput): Promise<void> {
  // PUT returns data: null — caller must re-GET to see the persisted values.
  await apiRequest<null>(`/products/${uuid}`, { method: 'PUT', body: JSON.stringify(input) })
}

// PUT /products/:uuid/status flips active<->inactive — it's the only status-change route,
// there is no separate DELETE. Response has data: null (no product/status payload), so the
// caller derives the new status from the status it sent the request against.
export async function toggleProductStatus(uuid: string): Promise<void> {
  await apiRequest<null>(`/products/${uuid}/status`, { method: 'PUT' })
}

import { apiRequest, type ApiMeta } from './client'

export type ProductCategory = 'beverages' | 'snacks' | 'grocery' | 'dairy' | 'others'
export type ProductStatus = 'active' | 'inactive'

export const PRODUCT_CATEGORIES: ProductCategory[] = ['beverages', 'snacks', 'grocery', 'dairy', 'others']

export interface Product {
  uuid: string
  name: string
  sku: string
  category: ProductCategory
  costPrice: number
  sellPrice: number
  tax: number
  weight: number
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface ListProductsParams {
  search?: string
  category?: ProductCategory
  status?: ProductStatus
  page: number
  limit: number
  sort?: 'name' | 'category' | 'cost_price' | 'sell_price'
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
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)

  const { data, meta } = await apiRequest<Product[]>(`/products?${query.toString()}`)
  // meta is always present on this endpoint (sendPaginated) — non-null assertion is safe here.
  return { items: data, meta: meta! }
}

export interface ProductFormInput {
  name: string
  sku: string
  category: ProductCategory
  weight: number
  costPrice: number
  sellPrice: number
  tax: number
}

export async function createProduct(input: ProductFormInput): Promise<void> {
  await apiRequest<null>('/products', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateProduct(uuid: string, input: ProductFormInput): Promise<void> {
  // updateProductBodySchema used to require cost_price/sell_price in snake_case while every other
  // field was camelCase (a confirmed bug — see docs/decisions.md, 2026-07-03). Fixed server-side as of
  // 2026-07-03: the schema now accepts costPrice/sellPrice camelCase like everywhere else, and the
  // repository's column map picks them up correctly. No translation needed — send input as-is.
  await apiRequest<null>(`/products/${uuid}`, { method: 'PUT', body: JSON.stringify(input) })
}

export async function deleteProduct(uuid: string): Promise<void> {
  // soft delete — server rejects with ALREADY_INACTIVE (409) if the product is already inactive.
  await apiRequest<null>(`/products/${uuid}`, { method: 'DELETE' })
}

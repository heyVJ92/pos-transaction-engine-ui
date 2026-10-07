import { getToken } from '../auth/token'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set — copy .env.example to .env.local and set it.')
}

// Set by AuthContext on mount. Called on a 401 from any authenticated call so the app can clear
// the stale token and redirect to login. Not called for /auth/login itself — a 401 there means
// bad credentials (a form error), not an expired session.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

export interface ApiMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ApiSuccess<T> {
  success: true
  data: T
  meta?: ApiMeta
}

interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export class ApiClientError extends Error {
  code: string
  details?: unknown
  status?: number

  constructor(code: string, message: string, details?: unknown, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
    this.status = status
  }
}

// stockapi's response envelope: {success:true,data,meta?} | {success:false,error:{code,message,details?}}
// see docs/api-reference.md — every resource follows this shape.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  const token = getToken()

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Could not reach the API — is stockapi running?')
  }

  let body: ApiEnvelope<T> | undefined
  try {
    body = (await res.json()) as ApiEnvelope<T>
  } catch {
    // response wasn't JSON at all (e.g. a raw 500 from something other than the global error handler)
    throw new ApiClientError('NETWORK_ERROR', `Unexpected response (status ${res.status})`, undefined, res.status)
  }

  if (!body.success) {
    if (res.status === 401 && path !== '/auth/login') {
      onUnauthorized?.()
    }
    throw new ApiClientError(body.error.code, body.error.message, body.error.details, res.status)
  }

  return body
}

// stockapi's validateQuery middleware builds VALIDATION_ERROR details via Zod v4's z.treeifyError(),
// e.g. {errors:[], properties:{name:{errors:["Required"]}, category:{errors:["Invalid option"]}}} —
// NOT the flat {field: string[]} shape API_PATTERNS.md documents (that doc has drifted, see
// docs/api-reference.md#known-gaps). Flatten it to {field: message} for form-error display.
interface ZodTreeifiedError {
  errors: string[]
  properties?: Record<string, ZodTreeifiedError>
}

export function extractFieldErrors(details: unknown): Record<string, string> {
  const tree = details as ZodTreeifiedError | undefined
  const fields: Record<string, string> = {}
  if (!tree?.properties) return fields
  for (const [key, value] of Object.entries(tree.properties)) {
    if (value.errors?.[0]) fields[key] = value.errors[0]
  }
  return fields
}

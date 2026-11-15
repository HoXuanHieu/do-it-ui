// Thin fetch wrapper for the DO-IT REST API (/api/v1).
// - Access token kept in memory only (never localStorage).
// - Refresh token is an httpOnly cookie handled by the browser.
// - On 401 the client tries one silent refresh, then retries the request.

export interface ProblemDetails {
  status: number
  title?: string
  detail?: string
  code?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails

  constructor(problem: ProblemDetails) {
    super(problem.title ?? `Request failed (${problem.status})`)
    this.status = problem.status
    this.problem = problem
  }
}

export interface UserDto {
  id: string
  email: string
  fullName: string | null
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresAt: string
  user: UserDto
}

// API origin. Empty = same origin (local dev via the Vite proxy). On GitHub Pages, which only serves
// static files, VITE_API_BASE_URL must point to the deployed backend (e.g. https://api.example.com).
const API_BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')}/api/v1`
// Cross-origin calls need 'include' so the httpOnly refresh cookie is sent/stored.
const CREDENTIALS: RequestCredentials = 'include'

let accessToken: string | null = null
let refreshInFlight: Promise<AuthResponse | null> | null = null
const listeners = new Set<(auth: AuthResponse | null) => void>()

export function onAuthChange(fn: (auth: AuthResponse | null) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setSession(auth: AuthResponse | null) {
  accessToken = auth?.accessToken ?? null
  listeners.forEach((fn) => fn(auth))
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Partial<ProblemDetails> = {}
  try {
    body = await res.json()
  } catch {
    /* empty or non-JSON body */
  }
  return new ApiError({ ...body, status: res.status })
}

/** Silent refresh, de-duplicated so parallel 401s only trigger one call. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: CREDENTIALS })
      if (!res.ok) {
        setSession(null)
        return null
      }
      const auth = (await res.json()) as AuthResponse
      setSession(auth)
      return auth
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

// Auth endpoints that must never trigger a silent refresh (they establish or end the session themselves).
const PUBLIC_AUTH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password']

type ApiInit = RequestInit & { json?: unknown; raw?: boolean }

async function request(path: string, init: ApiInit, retry: boolean): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.json !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: CREDENTIALS,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })

  if (res.status === 401 && retry && !PUBLIC_AUTH.includes(path)) {
    const refreshed = await refreshSession()
    if (refreshed) return request(path, init, false)
  }
  if (!res.ok) throw await parseError(res)
  return res
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await request(path, init, true)
  const isJson = res.headers.get('Content-Type')?.includes('json')
  if (res.status === 204 || !isJson) return undefined as T
  return (await res.json()) as T
}

/** Binary download (e.g. avatar). Returns null on 404. */
export async function apiBlob(path: string): Promise<Blob | null> {
  try {
    return await (await request(path, {}, true)).blob()
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

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

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', json: { email, password } }),
  register: (body: { email: string; password: string; confirmPassword: string; fullName?: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', json: body }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  me: () => api<UserDto>('/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api<AuthResponse>('/auth/change-password', { method: 'POST', json: body }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', json: { email } }),
  resetPassword: (body: { userId: string; token: string; newPassword: string; confirmPassword: string }) =>
    api<void>('/auth/reset-password', { method: 'POST', json: body }),
}

// ---------- Profile & preferences (FR-AUTH-004, FR-SH-004) ----------

export type Gender = 'Male' | 'Female' | 'Other' | 'PreferNotToSay'
export type Theme = 'System' | 'Light' | 'Dark'

export interface ProfileDto {
  email: string
  fullName: string | null
  dateOfBirth: string | null // YYYY-MM-DD
  gender: Gender | null
  hasAvatar: boolean
  updatedAt: string
}

export interface PreferencesDto {
  timeZone: string
  currency: string
  dateFormat: string
  theme: Theme
  language: string
  inAppNotifications: boolean
  emailNotifications: boolean
}

export interface PreferenceOptionsDto {
  currencies: string[]
  dateFormats: string[]
  languages: string[]
  themes: Theme[]
}

export const profileApi = {
  get: () => api<ProfileDto>('/profile'),
  update: (body: { fullName: string | null; dateOfBirth: string | null; gender: Gender | null }) =>
    api<ProfileDto>('/profile', { method: 'PUT', json: body }),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api<ProfileDto>('/profile/avatar', { method: 'PUT', body: form })
  },
  deleteAvatar: () => api<void>('/profile/avatar', { method: 'DELETE' }),
  avatar: () => apiBlob('/profile/avatar'),
}

export const preferencesApi = {
  get: () => api<PreferencesDto>('/preferences'),
  update: (body: PreferencesDto) => api<PreferencesDto>('/preferences', { method: 'PUT', json: body }),
  options: () => api<PreferenceOptionsDto>('/preferences/options'),
}

// ---------- Notifications (FR-SH-003) ----------

export type NotificationType = 'System' | 'Security' | 'EventReminder' | 'WorkoutReminder' | 'BudgetAlert'

export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  createdAt: string
  readAt: string | null
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.unreadOnly) q.set('unreadOnly', 'true')
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 20))
    return api<Paged<NotificationDto>>(`/notifications?${q}`)
  },
  unreadCount: () => api<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => api<void>('/notifications/read-all', { method: 'POST' }),
}

// ---------- Time management (SRS §4.3) ----------

export type EventCategory = 'Work' | 'Personal' | 'Meeting' | 'Health' | 'Study' | 'Other'
export type EventStatus = 'Planned' | 'Completed' | 'Cancelled'

export interface EventSummaryDto {
  id: string
  title: string
  category: EventCategory
  status: EventStatus
  startAt: string
  endAt: string
  isAllDay: boolean
  location: string | null
  hasReminders: boolean
}

export interface EventNoteDto {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface EventDetailDto extends Omit<EventSummaryDto, 'hasReminders'> {
  description: string | null
  reminderOffsets: number[]
  notes: EventNoteDto[]
  createdAt: string
  updatedAt: string
}

export interface EventInput {
  title: string
  startAt: string
  endAt: string
  isAllDay: boolean
  description: string | null
  location: string | null
  category: EventCategory
  reminderOffsets: number[]
}

export interface EventFilters {
  category?: EventCategory
  status?: EventStatus
  q?: string
}

export const eventsApi = {
  list: (from: Date, to: Date, filters: EventFilters = {}) => {
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    if (filters.category) q.set('category', filters.category)
    if (filters.status) q.set('status', filters.status)
    if (filters.q?.trim()) q.set('q', filters.q.trim())
    return api<EventSummaryDto[]>(`/events?${q}`)
  },
  get: (id: string) => api<EventDetailDto>(`/events/${id}`),
  create: (body: EventInput & { note?: string | null }) => api<EventDetailDto>('/events', { method: 'POST', json: body }),
  update: (id: string, body: EventInput & { status: EventStatus }) =>
    api<EventDetailDto>(`/events/${id}`, { method: 'PUT', json: body }),
  setStatus: (id: string, status: EventStatus) =>
    api<EventDetailDto>(`/events/${id}/status`, { method: 'PATCH', json: { status } }),
  remove: (id: string) => api<void>(`/events/${id}`, { method: 'DELETE' }),
  addNote: (id: string, content: string) => api<EventNoteDto>(`/events/${id}/notes`, { method: 'POST', json: { content } }),
  updateNote: (id: string, noteId: string, content: string) =>
    api<EventNoteDto>(`/events/${id}/notes/${noteId}`, { method: 'PUT', json: { content } }),
  removeNote: (id: string, noteId: string) => api<void>(`/events/${id}/notes/${noteId}`, { method: 'DELETE' }),
}

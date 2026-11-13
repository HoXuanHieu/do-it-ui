import { api } from '../../lib/api'

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

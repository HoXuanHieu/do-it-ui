import { api, type Paged } from '../../lib/api'

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

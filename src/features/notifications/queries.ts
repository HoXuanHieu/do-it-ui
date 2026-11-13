import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from './api'

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const useUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000, // poll; web push is P1 (Supplement SUP-TM-03)
    refetchOnWindowFocus: true,
  })

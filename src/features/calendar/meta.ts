import { t, type Key } from '../../i18n'
import type { EventCategory, EventStatus } from './api'

export const CATEGORIES: { value: EventCategory; label: Key }[] = [
  { value: 'Work', label: 'Công việc' },
  { value: 'Personal', label: 'Cá nhân' },
  { value: 'Meeting', label: 'Cuộc họp' },
  { value: 'Health', label: 'Sức khỏe' },
  { value: 'Study', label: 'Học tập' },
  { value: 'Other', label: 'Khác' },
]

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<EventCategory, Key>

export const STATUSES: { value: EventStatus; label: Key }[] = [
  { value: 'Planned', label: 'Đã lên lịch' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<EventStatus, Key>

/** FR-TM-008 */
export const REMINDERS: { value: number; label: Key }[] = [
  { value: 0, label: 'Đúng giờ' },
  { value: 5, label: '5 phút trước' },
  { value: 15, label: '15 phút trước' },
  { value: 30, label: '30 phút trước' },
  { value: 60, label: '1 giờ trước' },
  { value: 1440, label: '1 ngày trước' },
]

export const MAX_REMINDERS = 5

export const reminderLabel = (m: number) => {
  const r = REMINDERS.find((x) => x.value === m)
  return r ? t(r.label) : t('{m} phút trước', { m })
}

export const categoryClass = (c: EventCategory) => `cat-${c.toLowerCase()}`

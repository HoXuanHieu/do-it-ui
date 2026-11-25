import { locale, t, type Key } from '../../i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { NavIcon } from '../../components/NavIcon'
import { notificationsApi, type NotificationDto, type NotificationType } from './api'
import { notificationKeys } from './queries'

const PAGE_SIZE = 20

const TYPE_LABEL: Record<NotificationType, Key> = {
  System: 'Hệ thống',
  Security: 'Bảo mật',
  EventReminder: 'Nhắc lịch',
  WorkoutReminder: 'Tập luyện',
  BudgetAlert: 'Ngân sách',
  GoalReminder: 'Mục tiêu',
  HealthCheckIn: 'Sức khỏe',
}

// Deadline-style reminders the user should not miss.
const IMPORTANT: ReadonlySet<NotificationType> = new Set(['EventReminder', 'GoalReminder', 'BudgetAlert', 'Security'])

function relativeTime(iso: string, now: number) {
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day')
  return new Date(iso).toLocaleDateString(locale())
}

/** FR-SH-003: notification inbox. */
export function NotificationsPage() {
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [now] = useState(() => Date.now())

  const list = useQuery({
    queryKey: [...notificationKeys.all, { unreadOnly, page }],
    queryFn: () => notificationsApi.list({ unreadOnly, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: notificationKeys.all })
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: invalidate })
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate })

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalCount / PAGE_SIZE)) : 1

  return (
    <>
      <header className="page-header row-between">
        <div>
          <h1>{t('Thông báo')}</h1>
          <p className="muted">{t('Lưu trong 90 ngày.')}</p>
        </div>
        <div className="row">
          <label className="check">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
            />
            {t('Chỉ chưa đọc')}
          </label>
          <button className="btn-ghost" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            {t('Đánh dấu tất cả đã đọc')}
          </button>
        </div>
      </header>

      <section className="card list-card">
        {list.isPending && <p className="muted pad">{t('Đang tải…')}</p>}
        {list.isError && <p className="form-error pad">{t('Không tải được thông báo.')}</p>}
        {list.data?.items.length === 0 && <p className="muted pad">{t('Không có thông báo nào.')}</p>}
        <ul className="notif-list">
          {list.data?.items.map((n) => (
            <NotificationItem key={n.id} n={n} now={now} onRead={() => markRead.mutate(n.id)} />
          ))}
        </ul>
      </section>

      {totalPages > 1 && (
        <nav className="pager" aria-label={t('Phân trang')}>
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('← Trước')}
          </button>
          <span className="muted">
            {t('Trang {page}/{total}', { page, total: totalPages })}
          </span>
          <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t('Sau →')}
          </button>
        </nav>
      )}
    </>
  )
}

function NotificationItem({ n, now, onRead }: { n: NotificationDto; now: number; onRead: () => void }) {
  const unread = !n.readAt
  const important = IMPORTANT.has(n.type)
  return (
    <li className={['notif', unread && 'unread', important && 'important'].filter(Boolean).join(' ')}>
      <div className="notif-body">
        <div className="notif-head">
          {important && (
            <span className="tag tag-important">
              <NavIcon name="alert" />
              {t('Quan trọng')}
            </span>
          )}
          <span className={`tag tag-${n.type.toLowerCase()}`}>{t(TYPE_LABEL[n.type])}</span>
          <strong>{n.title}</strong>
          <time className="muted" dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString(locale())}>
            {relativeTime(n.createdAt, now)}
          </time>
        </div>
        <p>{n.message}</p>
      </div>
      <div className="notif-actions">
        {n.link && (
          <Link to={n.link} className="icon-btn" onClick={unread ? onRead : undefined} aria-label={t('Xem chi tiết')} title={t('Xem chi tiết')}>
            <NavIcon name="arrowRight" />
          </Link>
        )}
        {unread && (
          <button className="icon-btn" onClick={onRead} aria-label={t('Đánh dấu đã đọc')} title={t('Đánh dấu đã đọc')}>
            <NavIcon name="check" />
          </button>
        )}
      </div>
    </li>
  )
}

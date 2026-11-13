import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationsApi, type NotificationDto, type NotificationType } from './api'
import { notificationKeys } from './queries'

const PAGE_SIZE = 20

const TYPE_LABEL: Record<NotificationType, string> = {
  System: 'Hệ thống',
  Security: 'Bảo mật',
  EventReminder: 'Nhắc lịch',
  WorkoutReminder: 'Tập luyện',
  BudgetAlert: 'Ngân sách',
}

const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

function relativeTime(iso: string, now: number) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day')
  return new Date(iso).toLocaleDateString('vi-VN')
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
          <h1>Thông báo</h1>
          <p className="muted">Lưu trong 90 ngày.</p>
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
            Chỉ chưa đọc
          </label>
          <button className="btn-ghost" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </header>

      <section className="card list-card">
        {list.isPending && <p className="muted pad">Đang tải…</p>}
        {list.isError && <p className="form-error pad">Không tải được thông báo.</p>}
        {list.data?.items.length === 0 && <p className="muted pad">Không có thông báo nào.</p>}
        <ul className="notif-list">
          {list.data?.items.map((n) => (
            <NotificationItem key={n.id} n={n} now={now} onRead={() => markRead.mutate(n.id)} />
          ))}
        </ul>
      </section>

      {totalPages > 1 && (
        <nav className="pager" aria-label="Phân trang">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Trước
          </button>
          <span className="muted">
            Trang {page}/{totalPages}
          </span>
          <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sau →
          </button>
        </nav>
      )}
    </>
  )
}

function NotificationItem({ n, now, onRead }: { n: NotificationDto; now: number; onRead: () => void }) {
  const unread = !n.readAt
  return (
    <li className={unread ? 'notif unread' : 'notif'}>
      <div className="notif-head">
        <span className={`tag tag-${n.type.toLowerCase()}`}>{TYPE_LABEL[n.type]}</span>
        <strong>{n.title}</strong>
        <time className="muted" dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString('vi-VN')}>
          {relativeTime(n.createdAt, now)}
        </time>
      </div>
      <p>{n.message}</p>
      <div className="row">
        {n.link && (
          <Link to={n.link} onClick={unread ? onRead : undefined}>
            Xem chi tiết
          </Link>
        )}
        {unread && (
          <button className="btn-link" onClick={onRead}>
            Đánh dấu đã đọc
          </button>
        )}
      </div>
    </li>
  )
}

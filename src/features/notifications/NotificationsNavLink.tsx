import { NavLink } from 'react-router-dom'
import { useUnreadCount } from './queries'

/** Sidebar link with unread badge. Kept out of NotificationsPage so the shell does not pull in the lazy page. */
export function NotificationsNavLink() {
  const { data } = useUnreadCount()
  const count = data?.count ?? 0
  return (
    <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active' : undefined)}>
      Thông báo
      {count > 0 && (
        <span className="badge" aria-label={`${count} chưa đọc`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  )
}

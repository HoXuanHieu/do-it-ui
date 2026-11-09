import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAvatarUrl, useProfile, useThemeSync } from '../features/account/queries'
import { useAuth } from '../features/auth/AuthContext'
import { NotificationsNavLink } from '../features/notifications/NotificationsPage'

const NAV = [
  { to: '/', label: 'Tổng quan', end: true },
  { to: '/calendar', label: 'Lịch & Sự kiện' },
  { to: '/health', label: 'Sức khỏe' },
  { to: '/finance', label: 'Tài chính' },
  { to: '/goals', label: 'Mục tiêu' },
]

/** Authenticated shell: guards routes and renders the module navigation. */
export function AppLayout() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <div className="splash">Đang tải…</div>
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Shell />
}

function Shell() {
  const { user, logout } = useAuth()
  const { data: profile } = useProfile()
  const avatarUrl = useAvatarUrl(profile)
  useThemeSync()

  const name = user?.fullName ?? user?.email ?? ''

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">DO-IT</div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {n.label}
            </NavLink>
          ))}
          <NotificationsNavLink />
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Cài đặt
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <Link to="/profile" className="user" title={user?.email}>
            <span className="avatar avatar-sm" aria-hidden>
              {avatarUrl ? <img src={avatarUrl} alt="" /> : name.charAt(0).toUpperCase()}
            </span>
            <span className="user-name">{name}</span>
          </Link>
          <button className="btn-ghost" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

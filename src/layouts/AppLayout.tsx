import { t, type Key } from '../i18n'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { NavIcon, type NavIconName } from '../components/NavIcon'
import { useAvatarUrl, useLanguageSync, useProfile, useThemeSync } from '../features/account/queries'
import { useAuth } from '../features/auth/AuthContext'
import { MedicationReminderPopup } from '../features/health/MedicationReminder'
import { NotificationsNavLink } from '../features/notifications/NotificationsNavLink'

const NAV: { to: string; label: Key; icon: NavIconName; end?: boolean }[] = [
  { to: '/', label: 'Tổng quan', icon: 'home', end: true },
  { to: '/calendar', label: 'Lịch & Sự kiện', icon: 'calendar' },
  { to: '/health', label: 'Sức khỏe', icon: 'health' },
  { to: '/finance', label: 'Tài chính', icon: 'finance' },
  { to: '/goals', label: 'Mục tiêu', icon: 'goals' },
]

/** Authenticated shell: guards routes and renders the module navigation. */
export function AppLayout() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <div className="splash">{t('Đang tải…')}</div>
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Shell />
}

function Shell() {
  const { user, logout } = useAuth()
  const { data: profile } = useProfile()
  const avatarUrl = useAvatarUrl(profile)
  useThemeSync()
  useLanguageSync()

  const name = user?.fullName ?? user?.email ?? ''

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">DO-IT</div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <NavIcon name={n.icon} />
              {t(n.label)}
            </NavLink>
          ))}
          <NotificationsNavLink />
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <NavIcon name="settings" />
            {t('Cài đặt')}
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
            {t('Đăng xuất')}
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <MedicationReminderPopup />
    </div>
  )
}

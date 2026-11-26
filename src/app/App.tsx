import { useLanguage } from '../i18n'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../features/auth/AuthPages'
import { AppLayout } from '../layouts/AppLayout'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { NotFoundPage } from '../pages/Pages'
import { LegalPage } from '../features/legal/LegalPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

// Feature pages are lazy-loaded (route-level code splitting).
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/privacy', element: <LegalPage doc="privacy" /> },
  { path: '/terms', element: <LegalPage doc="terms" /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calendar', lazy: async () => ({ Component: (await import('../features/calendar/CalendarPage')).CalendarPage }) },
      { path: 'health', lazy: async () => ({ Component: (await import('../features/health/HealthPage')).HealthPage }) },
      { path: 'health/:id', lazy: async () => ({ Component: (await import('../features/health/HealthProfilePage')).HealthProfilePage }) },
      { path: 'finance', lazy: async () => ({ Component: (await import('../features/finance/FinancePage')).FinancePage }) },
      { path: 'goals', lazy: async () => ({ Component: (await import('../features/goals/GoalsPage')).GoalsPage }) },
      { path: 'goals/:id', lazy: async () => ({ Component: (await import('../features/goals/GoalDetailPage')).GoalDetailPage }) },
      { path: 'profile', lazy: async () => ({ Component: (await import('../features/account/ProfilePage')).ProfilePage }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('../features/account/SettingsPage')).SettingsPage }) },
      {
        path: 'notifications',
        lazy: async () => ({ Component: (await import('../features/notifications/NotificationsPage')).NotificationsPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL })

export function App() {
  const lang = useLanguage()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* keyed so every t() call re-renders when the language changes */}
        <RouterProvider key={lang} router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

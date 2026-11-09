import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../features/auth/AuthPages'
import { AppLayout } from '../layouts/AppLayout'
import { ComingSoonPage, DashboardPage, NotFoundPage } from '../pages/Pages'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

// Feature pages are lazy-loaded (route-level code splitting).
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calendar', lazy: async () => ({ Component: (await import('../features/calendar/CalendarPage')).CalendarPage }) },
      { path: 'health', element: <ComingSoonPage title="Sức khỏe" /> },
      { path: 'finance', lazy: async () => ({ Component: (await import('../features/finance/FinancePage')).FinancePage }) },
      { path: 'goals', element: <ComingSoonPage title="Mục tiêu" /> },
      { path: 'profile', lazy: async () => ({ Component: (await import('../features/account/ProfilePage')).ProfilePage }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('../features/account/SettingsPage')).SettingsPage }) },
      {
        path: 'notifications',
        lazy: async () => ({ Component: (await import('../features/notifications/NotificationsPage')).NotificationsPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

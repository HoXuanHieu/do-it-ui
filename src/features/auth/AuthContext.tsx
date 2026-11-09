import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, onAuthChange, refreshSession, setSession, type UserDto } from '../../lib/api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  status: Status
  user: UserDto | null
  login: (email: string, password: string) => Promise<void>
  register: (body: { email: string; password: string; confirmPassword: string; fullName?: string }) => Promise<void>
  logout: () => Promise<void>
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>
  /** Re-read the user (e.g. after the profile name changed). */
  reloadUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const queryClient = useQueryClient()

  useEffect(() => {
    const off = onAuthChange((auth) => {
      setUser(auth?.user ?? null)
      setStatus(auth ? 'authenticated' : 'anonymous')
      // Never leak cached data of a previous user.
      if (!auth) queryClient.clear()
    })
    // Restore session from the refresh cookie on page load.
    void refreshSession()
    return () => {
      off()
    }
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    setSession(await authApi.login(email, password))
  }, [])

  const register = useCallback(
    async (body: { email: string; password: string; confirmPassword: string; fullName?: string }) => {
      setSession(await authApi.register(body))
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setSession(null)
    }
  }, [])

  const changePassword = useCallback(
    async (body: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      setSession(await authApi.changePassword(body))
    },
    [],
  )

  const reloadUser = useCallback(async () => {
    setUser(await authApi.me())
  }, [])

  const value = useMemo(
    () => ({ status, user, login, register, logout, changePassword, reloadUser }),
    [status, user, login, register, logout, changePassword, reloadUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

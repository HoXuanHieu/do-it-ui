import { api, type AuthResponse, type UserDto } from '../../lib/api'

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', json: { email, password } }),
  register: (body: { email: string; password: string; confirmPassword: string; fullName?: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', json: body }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  me: () => api<UserDto>('/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api<AuthResponse>('/auth/change-password', { method: 'POST', json: body }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', json: { email } }),
  resetPassword: (body: { userId: string; token: string; newPassword: string; confirmPassword: string }) =>
    api<void>('/auth/reset-password', { method: 'POST', json: body }),
}

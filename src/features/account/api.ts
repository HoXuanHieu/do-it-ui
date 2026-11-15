import { api, apiBlob } from '../../lib/api'

// ---------- Profile & preferences (FR-AUTH-004, FR-SH-004) ----------

export type Gender = 'Male' | 'Female' | 'Other' | 'PreferNotToSay'
export type Theme = 'System' | 'Light' | 'Dark'

export interface ProfileDto {
  email: string
  fullName: string | null
  dateOfBirth: string | null // YYYY-MM-DD
  gender: Gender | null
  hasAvatar: boolean
  updatedAt: string
}

export interface PreferencesDto {
  timeZone: string
  currency: string
  dateFormat: string
  theme: Theme
  language: string
  inAppNotifications: boolean
  emailNotifications: boolean
}

export interface PreferenceOptionsDto {
  currencies: string[]
  dateFormats: string[]
  languages: string[]
  themes: Theme[]
}

export const profileApi = {
  get: () => api<ProfileDto>('/profile'),
  update: (body: { fullName: string | null; dateOfBirth: string | null; gender: Gender | null }) =>
    api<ProfileDto>('/profile', { method: 'PUT', json: body }),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api<ProfileDto>('/profile/avatar', { method: 'PUT', body: form })
  },
  deleteAvatar: () => api<void>('/profile/avatar', { method: 'DELETE' }),
  avatar: () => apiBlob('/profile/avatar'),
}

export const preferencesApi = {
  get: () => api<PreferencesDto>('/preferences'),
  update: (body: PreferencesDto) => api<PreferencesDto>('/preferences', { method: 'PUT', json: body }),
  options: () => api<PreferenceOptionsDto>('/preferences/options'),
}

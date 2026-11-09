import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { notificationsApi, preferencesApi, profileApi, type PreferencesDto, type ProfileDto } from '../../lib/api'

export const keys = {
  profile: ['profile'] as const,
  avatar: (version: string) => ['profile', 'avatar', version] as const,
  preferences: ['preferences'] as const,
  preferenceOptions: ['preferences', 'options'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: profileApi.get })

export const usePreferences = () => useQuery({ queryKey: keys.preferences, queryFn: preferencesApi.get })

export const usePreferenceOptions = () =>
  useQuery({ queryKey: keys.preferenceOptions, queryFn: preferencesApi.options, staleTime: Infinity })

export function useUpdatePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PreferencesDto) => preferencesApi.update(body),
    onSuccess: (data) => qc.setQueryData(keys.preferences, data),
  })
}

export function useSetProfile() {
  const qc = useQueryClient()
  return (data: ProfileDto) => qc.setQueryData(keys.profile, data)
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Avatar is served behind auth, so it is fetched as a blob and exposed as a data URL (<= 2 MB). */
export function useAvatarUrl(profile: ProfileDto | undefined) {
  const { data } = useQuery({
    queryKey: keys.avatar(profile?.updatedAt ?? ''),
    queryFn: async () => {
      const blob = await profileApi.avatar()
      return blob ? toDataUrl(blob) : null
    },
    enabled: !!profile?.hasAvatar,
    staleTime: Infinity,
  })
  return profile?.hasAvatar ? (data ?? null) : null
}

export const useUnreadCount = () =>
  useQuery({
    queryKey: keys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000, // poll; web push is P1 (Supplement SUP-TM-03)
    refetchOnWindowFocus: true,
  })

/** Apply the theme preference to <html data-theme>; "System" defers to prefers-color-scheme. */
export function useThemeSync() {
  const { data } = usePreferences()
  useEffect(() => {
    const root = document.documentElement
    if (!data || data.theme === 'System') delete root.dataset.theme
    else root.dataset.theme = data.theme.toLowerCase()
  }, [data])
}

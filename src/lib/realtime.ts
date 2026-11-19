import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE, getAccessToken, refreshSession } from './api'

// Server pushes "changed" with a module name after any write (other tabs/devices); we just refetch that module.
const MODULE_KEYS: Record<string, readonly (readonly string[])[]> = {
  finance: [['finance'], ['notifications']], // finance writes can raise budget notifications
  events: [['events']],
  goals: [['goals']],
  health: [['health']],
}

export function useRealtime(enabled: boolean) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hub`, {
        accessTokenFactory: async () => getAccessToken() ?? (await refreshSession())?.accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    conn.on('changed', (module: string) => {
      MODULE_KEYS[module]?.forEach((queryKey) => void qc.invalidateQueries({ queryKey }))
    })
    // Missed pushes while disconnected: refetch everything this hook covers.
    conn.onreconnected(() => Object.values(MODULE_KEYS).flat().forEach((queryKey) => void qc.invalidateQueries({ queryKey })))

    const started = conn.start().catch(() => {
      /* realtime is best-effort; the app still works via normal fetches */
    })
    return () => {
      void started.then(() => conn.stop())
    }
  }, [enabled, qc])
}

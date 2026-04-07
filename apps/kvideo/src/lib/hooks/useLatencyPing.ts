/**
 * useLatencyPing - Hook for real-time latency measurement
 * Periodically pings video sources when enabled
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { settingsStore } from '@/lib/store/settings-store'

interface LatencyState {
  [sourceId: string]: number
}

interface UseLatencyPingOptions {
  sourceUrls: { id: string; baseUrl: string }[]
  enabled?: boolean
  intervalMs?: number
}

export function useLatencyPing({
  sourceUrls,
  enabled = true,
  intervalMs = 5000,
}: UseLatencyPingOptions) {
  const [latencies, setLatencies] = useState<LatencyState>({})
  const [isLoading, setIsLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Check if real-time latency is enabled in settings
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)

  // Stabilize sourceUrls to prevent unnecessary effect re-runs if parent passes new array
  const stableSourceUrls = useMemo(() => sourceUrls, [sourceUrls])

  useEffect(() => {
    const settings = settingsStore.getSettings()
    setRealtimeEnabled(settings.realtimeLatency)

    // Subscribe to settings changes
    const unsubscribe = settingsStore.subscribe(() => {
      const newSettings = settingsStore.getSettings()
      setRealtimeEnabled(newSettings.realtimeLatency)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const pingSource = useCallback(
    async (sourceId: string, baseUrl: string): Promise<number | null> => {
      try {
        const response = await fetch('/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: baseUrl }),
        })

        if (response.ok) {
          const data = await response.json()
          return data.latency || null
        }
        return null
      } catch {
        return null
      }
    },
    [],
  )

  const pingAllSources = useCallback(async () => {
    if (!mountedRef.current || stableSourceUrls.length === 0) return

    setIsLoading(true)

    const results = await Promise.all(
      stableSourceUrls.map(async ({ id, baseUrl }) => {
        const latency = await pingSource(id, baseUrl)
        return { id, latency }
      }),
    )

    if (mountedRef.current) {
      setLatencies((prev) => {
        const newState = { ...prev }
        results.forEach(({ id, latency }) => {
          if (latency !== null) {
            newState[id] = latency
          }
        })
        return newState
      })
      setIsLoading(false)
    }
  }, [stableSourceUrls, pingSource])

  // Start/stop polling based on enabled state
  useEffect(() => {
    mountedRef.current = true

    const shouldPoll = enabled && realtimeEnabled && stableSourceUrls.length > 0

    if (shouldPoll) {
      // Initial ping
      pingAllSources()

      // Set up interval
      intervalRef.current = setInterval(pingAllSources, intervalMs)
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, realtimeEnabled, stableSourceUrls, intervalMs, pingAllSources])

  const refreshLatency = useCallback(
    (sourceId: string) => {
      const source = stableSourceUrls.find((s) => s.id === sourceId)
      if (source) {
        pingSource(sourceId, source.baseUrl).then((latency) => {
          if (latency !== null && mountedRef.current) {
            setLatencies((prev) => ({ ...prev, [sourceId]: latency }))
          }
        })
      }
    },
    [stableSourceUrls, pingSource],
  )

  const refreshAll = useCallback(() => {
    pingAllSources()
  }, [pingAllSources])

  return {
    latencies,
    isLoading,
    refreshLatency,
    refreshAll,
    isRealtimeEnabled: realtimeEnabled,
  }
}

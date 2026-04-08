'use client'

import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'

interface UseLatencyPingOptions {
  sourceUrls: { id: string; baseUrl: string }[]
  enabled?: boolean
  intervalMs?: number
}

async function pingSource(baseUrl: string): Promise<number | null> {
  try {
    const response = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: baseUrl }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.latency ?? null
  } catch {
    return null
  }
}

export function useLatencyPing({
  sourceUrls,
  enabled = true,
  intervalMs = 5000,
}: UseLatencyPingOptions) {
  const realtimeEnabled = useSettingsStore((s) => s.realtimeLatency)
  const shouldPing = enabled && realtimeEnabled && sourceUrls.length > 0

  const queries = useQueries({
    queries: shouldPing
      ? sourceUrls.map(({ id, baseUrl }) => ({
          queryKey: ['latency', id] as const,
          queryFn: () => pingSource(baseUrl),
          refetchInterval: intervalMs,
          staleTime: 0,
          retry: false,
        }))
      : [],
  })

  const latencies = useMemo(() => {
    const result: Record<string, number> = {}
    queries.forEach((query, i) => {
      if (query.data != null) {
        result[sourceUrls[i].id] = query.data
      }
    })
    return result
  }, [queries, sourceUrls])

  return {
    latencies,
    isLoading: queries.some((q) => q.isLoading),
    isRealtimeEnabled: realtimeEnabled,
  }
}

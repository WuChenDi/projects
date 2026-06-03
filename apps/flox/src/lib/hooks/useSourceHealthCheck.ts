'use client'

import { useState } from 'react'
import type { VideoSource } from '@/lib/types'

const CONCURRENCY = 8

/**
 * Probes every source via `/api/check-source` with a bounded concurrency queue
 * and returns the set of source ids that are reachable. Exposes live progress
 * so the settings button can show "检测中 x/y".
 */
export function useSourceHealthCheck() {
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const runCheck = async (sources: VideoSource[]): Promise<Set<string>> => {
    const healthy = new Set<string>()
    setChecking(true)
    setProgress({ done: 0, total: sources.length })

    let index = 0
    let done = 0

    const worker = async () => {
      while (index < sources.length) {
        const source = sources[index++]
        try {
          const res = await fetch('/api/check-source', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: source.baseUrl,
              searchPath: source.searchPath || '',
            }),
          })
          const data = (await res.json()) as { ok?: boolean }
          if (data.ok) healthy.add(source.id)
        } catch {
          // Network/parse failure → treat as unavailable
        } finally {
          done++
          setProgress({ done, total: sources.length })
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, sources.length) }, worker),
    )

    setChecking(false)
    return healthy
  }

  return { checking, progress, runCheck }
}

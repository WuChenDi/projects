'use client'

import { useEffect } from 'react'
import { settingsStore } from '@/lib/store/settings-store'
import { fetchSourcesFromUrl, mergeSources } from '@/lib/utils/source-import-utils'

const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour

export function useSubscriptionAutoRefresh() {
  useEffect(() => {
    const settings = settingsStore.getSettings()
    const stale = settings.subscriptions.filter(
      (sub) =>
        sub.autoRefresh &&
        (sub.lastUpdated === 0 || Date.now() - sub.lastUpdated > AUTO_REFRESH_INTERVAL),
    )

    if (stale.length === 0) return

    for (const sub of stale) {
      void fetchSourcesFromUrl(sub.url)
        .then((result) => {
          const current = settingsStore.getSettings()
          settingsStore.saveSettings({
            ...current,
            sources: mergeSources(current.sources, result.normalSources),
            premiumSources: mergeSources(current.premiumSources, result.premiumSources),
            subscriptions: current.subscriptions.map((s) =>
              s.id === sub.id ? { ...s, lastUpdated: Date.now() } : s,
            ),
          })
        })
        .catch(() => {
          // Silent failure — background refresh should not interrupt the user
        })
    }
  }, [])
}

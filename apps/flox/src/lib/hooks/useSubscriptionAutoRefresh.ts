'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'
import { fetchSourcesFromUrl } from '@/lib/utils/source-import-utils'

const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour

export function useSubscriptionAutoRefresh() {
  useEffect(() => {
    const { subscriptions, mergeImportedSources, markSubscriptionRefreshed } =
      useSettingsStore.getState()

    const stale = subscriptions.filter(
      (sub) =>
        sub.autoRefresh &&
        (sub.lastUpdated === 0 ||
          Date.now() - sub.lastUpdated > AUTO_REFRESH_INTERVAL),
    )

    if (stale.length === 0) return

    for (const sub of stale) {
      void fetchSourcesFromUrl(sub.url)
        .then((result) => {
          mergeImportedSources({
            normalSources: result.normalSources,
            premiumSources: result.premiumSources,
          })
          markSubscriptionRefreshed(sub.id)
        })
        .catch(() => {
          // Silent failure — background refresh should not interrupt the user
        })
    }
  }, [])
}

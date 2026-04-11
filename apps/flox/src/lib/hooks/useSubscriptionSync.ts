import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { settingsStore } from '@/lib/store/settings-store'
import type { SourceSubscription } from '@/lib/types'
import {
  fetchSourcesFromUrl,
  mergeSources,
} from '@/lib/utils/source-import-utils'

const SYNC_COOLDOWN_MS = 5 * 60 * 1000
const INITIAL_SYNC_DELAY_MS = 1000

async function syncSubscriptions() {
  const settings = settingsStore.getSettings()
  const now = Date.now()

  const subsToSync = settings.subscriptions.filter(
    (sub: SourceSubscription) =>
      sub.autoRefresh !== false &&
      !(sub.lastUpdated && now - sub.lastUpdated < SYNC_COOLDOWN_MS),
  )

  if (subsToSync.length === 0) return null

  const results = await Promise.allSettled(
    subsToSync.map((sub: SourceSubscription) => fetchSourcesFromUrl(sub.url)),
  )

  let anyChanged = false
  let currentSources = [...settings.sources]
  let currentPremiumSources = [...settings.premiumSources]
  const updatedSubscriptions = [...settings.subscriptions]

  results.forEach((result, index) => {
    const sub = subsToSync[index]
    if (result.status === 'fulfilled') {
      const { normalSources, premiumSources } = result.value
      if (normalSources.length > 0) {
        currentSources = mergeSources(currentSources, normalSources)
        anyChanged = true
      }
      if (premiumSources.length > 0) {
        currentPremiumSources = mergeSources(
          currentPremiumSources,
          premiumSources,
        )
        anyChanged = true
      }
      const subIdx = updatedSubscriptions.findIndex((s) => s.id === sub.id)
      if (subIdx !== -1) {
        updatedSubscriptions[subIdx] = {
          ...updatedSubscriptions[subIdx],
          lastUpdated: now,
        }
        anyChanged = true
      }
    } else {
      console.error(`Failed to sync subscription: ${sub.name}`, result.reason)
    }
  })

  if (!anyChanged) return null

  return {
    ...settings,
    sources: currentSources,
    premiumSources: currentPremiumSources,
    subscriptions: updatedSubscriptions,
  }
}

export function useSubscriptionSync() {
  const { mutate } = useMutation({
    mutationFn: syncSubscriptions,
    onSuccess: (result) => {
      if (result) settingsStore.saveSettings(result)
    },
  })

  useEffect(() => {
    const timer = setTimeout(() => mutate(), INITIAL_SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [mutate]) // run once on mount
}

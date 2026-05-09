import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'
import type { SourceSubscription, VideoSource } from '@/lib/types'
import { fetchSourcesFromUrl } from '@/lib/utils/source-import-utils'

const SYNC_COOLDOWN_MS = 5 * 60 * 1000
const INITIAL_SYNC_DELAY_MS = 1000

interface SyncOutcome {
  normalSources: VideoSource[]
  premiumSources: VideoSource[]
  refreshedIds: string[]
}

async function syncSubscriptions(): Promise<SyncOutcome | null> {
  const { subscriptions } = useSettingsStore.getState()
  const now = Date.now()

  const subsToSync = subscriptions.filter(
    (sub: SourceSubscription) =>
      sub.autoRefresh !== false &&
      !(sub.lastUpdated && now - sub.lastUpdated < SYNC_COOLDOWN_MS),
  )

  if (subsToSync.length === 0) return null

  const results = await Promise.allSettled(
    subsToSync.map((sub) => fetchSourcesFromUrl(sub.url)),
  )

  const normalSources: VideoSource[] = []
  const premiumSources: VideoSource[] = []
  const refreshedIds: string[] = []

  results.forEach((result, index) => {
    const sub = subsToSync[index]
    if (result.status === 'fulfilled') {
      normalSources.push(...result.value.normalSources)
      premiumSources.push(...result.value.premiumSources)
      refreshedIds.push(sub.id)
    } else {
      console.error(`Failed to sync subscription: ${sub.name}`, result.reason)
    }
  })

  if (refreshedIds.length === 0) return null

  return { normalSources, premiumSources, refreshedIds }
}

export function useSubscriptionSync() {
  const { mutate } = useMutation({
    mutationFn: syncSubscriptions,
    onSuccess: (result) => {
      if (!result) return
      const { mergeImportedSources, markSubscriptionRefreshed } =
        useSettingsStore.getState()
      mergeImportedSources({
        normalSources: result.normalSources,
        premiumSources: result.premiumSources,
      })
      result.refreshedIds.forEach(markSubscriptionRefreshed)
    },
  })

  useEffect(() => {
    const timer = setTimeout(() => mutate(), INITIAL_SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [mutate])
}

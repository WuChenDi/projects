import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { SourceBadge, Video } from '@/lib/types'

export const SEARCH_STALE_TIME = 5 * 60 * 1000 // 5 minutes per-session cache

export const searchQueryKey = (query: string) => ['search', query] as const

export interface SearchCacheEntry {
  results: Video[]
  availableSources: SourceBadge[]
}

const MAX_CACHED_RESULTS = 300

const stripVideoData = (results: any[]): any[] =>
  results.slice(0, MAX_CACHED_RESULTS).map((video) => {
    const { vod_content, vod_actor, vod_director, ...rest } = video
    return rest
  })

export function useSearchCache() {
  const queryClient = useQueryClient()

  const saveToCache = useCallback(
    (query: string, results: any[], sources: any[]) => {
      queryClient.setQueryData<SearchCacheEntry>(searchQueryKey(query), {
        results: stripVideoData(results),
        availableSources: sources,
      })
    },
    [queryClient],
  )

  const loadFromCache = useCallback(
    (query: string): SearchCacheEntry | null => {
      const state = queryClient.getQueryState(searchQueryKey(query))
      if (!state?.dataUpdatedAt) return null
      if (Date.now() - state.dataUpdatedAt > SEARCH_STALE_TIME) return null
      return queryClient.getQueryData<SearchCacheEntry>(searchQueryKey(query)) ?? null
    },
    [queryClient],
  )

  return { saveToCache, loadFromCache }
}

import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useSettingsStore } from '@/lib/store/settings-store'
import type { Video } from '@/lib/types'

const PAGE_LIMIT = 20

export function usePremiumContent(categoryValue: string) {
  const rawPremiumSources = useSettingsStore((s) => s.premiumSources)
  const subscriptions = useSettingsStore((s) => s.subscriptions)

  const premiumSources = useMemo(
    () =>
      [
        ...rawPremiumSources,
        ...subscriptions.filter((sub) => (sub as any).group === 'premium'),
      ].filter((src) => (src as any).enabled !== false),
    [rawPremiumSources, subscriptions],
  )

  // Build a lookup map: source id → source name
  const sourceNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const src of premiumSources) {
      map.set(src.id, src.name)
    }
    return map
  }, [premiumSources])

  // Stable key for query invalidation when sources change
  const sourcesKey = premiumSources.map((s) => s.id).join(',')

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['premiumContent', categoryValue, sourcesKey],
      queryFn: async ({ pageParam }) => {
        const response = await fetch('/api/premium/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sources: premiumSources,
            category: categoryValue,
            page: String(pageParam),
            limit: String(PAGE_LIMIT),
          }),
        })
        if (!response.ok) throw new Error('Failed to fetch premium content')
        const json = await response.json()
        return (json.videos ?? []) as Video[]
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, _allPages, lastPageParam) =>
        lastPage.length === PAGE_LIMIT
          ? (lastPageParam as number) + 1
          : undefined,
      enabled: premiumSources.length > 0,
      staleTime: 2 * 60 * 1000,
    })

  // Enrich videos with sourceName from the lookup map
  const videos: Video[] = useMemo(
    () =>
      (data?.pages.flat() ?? []).map((v) => ({
        ...v,
        sourceName: v.sourceName || sourceNameMap.get(v.source),
      })),
    [data?.pages, sourceNameMap],
  )

  const loading = isLoading || isFetchingNextPage

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore: !!hasNextPage,
    loading,
    onLoadMore: useCallback(() => fetchNextPage(), [fetchNextPage]),
  })

  return {
    videos,
    loading,
    hasMore: !!hasNextPage,
    prefetchRef,
    loadMoreRef,
  }
}

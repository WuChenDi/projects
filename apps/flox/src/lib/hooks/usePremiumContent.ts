import { useInfiniteQuery } from '@tanstack/react-query'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useSettingsStore } from '@/lib/store/settings-store'

interface PremiumVideo {
  vod_id: string | number
  vod_name: string
  vod_pic?: string
  vod_remarks?: string
  type_name?: string
  source: string
}

const PAGE_LIMIT = 20

export function usePremiumContent(categoryValue: string) {
  const premiumSources = useSettingsStore((s) =>
    [
      ...s.premiumSources,
      ...s.subscriptions.filter((sub) => (sub as any).group === 'premium'),
    ].filter((src) => (src as any).enabled !== false),
  )

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
        return (json.videos ?? []) as PremiumVideo[]
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, _allPages, lastPageParam) =>
        lastPage.length === PAGE_LIMIT ? (lastPageParam as number) + 1 : undefined,
      enabled: premiumSources.length > 0,
      staleTime: 2 * 60 * 1000,
    })

  const videos = data?.pages.flat() ?? []
  const loading = isLoading || isFetchingNextPage

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore: !!hasNextPage,
    loading,
    page: data?.pages.length ?? 0,
    onLoadMore: () => fetchNextPage(),
  })

  return {
    videos,
    loading,
    hasMore: !!hasNextPage,
    prefetchRef,
    loadMoreRef,
  }
}

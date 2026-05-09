import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import type { Tag, Video } from '@/lib/types'

interface DoubanMovie {
  id: string
  title: string
  cover: string
  rate: string
  url: string
}

function mapToVideo(movie: DoubanMovie): Video {
  return {
    vod_id: movie.id,
    vod_name: movie.title,
    vod_pic: movie.cover,
    vod_remarks:
      movie.rate && parseFloat(movie.rate) > 0 ? `⭐ ${movie.rate}` : undefined,
    source: 'douban',
    sourceName: '豆瓣',
  }
}

const PAGE_LIMIT = 20

export function usePopularMovies(
  selectedTag: string,
  tags: Tag[],
  contentType: 'movie' | 'tv' = 'movie',
) {
  // Resolve to a stable string so unrelated `tags` reference changes
  // don't cause an unnecessary re-fetch.
  const tagValue = tags.find((t) => t.id === selectedTag)?.value || '热门'

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['popularMovies', contentType, tagValue],
      queryFn: async ({ pageParam, signal }) => {
        const res = await fetch(
          `/api/douban/recommend?type=${contentType}&tag=${encodeURIComponent(tagValue)}&page_limit=${PAGE_LIMIT}&page_start=${pageParam}`,
          { signal },
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        return ((json.subjects ?? []) as DoubanMovie[]).map(mapToVideo)
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, _allPages, lastPageParam) =>
        lastPage.length === PAGE_LIMIT
          ? (lastPageParam as number) + PAGE_LIMIT
          : undefined,
      staleTime: 5 * 60 * 1000,
    })

  const movies = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const loading = isLoading || isFetchingNextPage

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore: !!hasNextPage,
    loading,
    onLoadMore: useCallback(() => fetchNextPage(), [fetchNextPage]),
  })

  return {
    movies,
    loading,
    hasMore: !!hasNextPage,
    prefetchRef,
    loadMoreRef,
  }
}

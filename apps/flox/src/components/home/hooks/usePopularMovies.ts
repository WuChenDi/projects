import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'

interface DoubanMovie {
  id: string
  title: string
  cover: string
  rate: string
  url: string
}

const PAGE_LIMIT = 20

export function usePopularMovies(
  selectedTag: string,
  tags: any[],
  contentType: 'movie' | 'tv' = 'movie',
) {
  const [movies, setMovies] = useState<DoubanMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const loadingRef = useRef(false)

  const loadMovies = useCallback(
    async (tag: string, pageStart: number, append = false) => {
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      try {
        const tagValue = tags.find((t) => t.id === tag)?.value || '热门'
        const response = await fetch(
          `/api/douban/recommend?type=${contentType}&tag=${encodeURIComponent(tagValue)}&page_limit=${PAGE_LIMIT}&page_start=${pageStart}`,
        )

        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        const newMovies = data.subjects || []

        setMovies((prev) => (append ? [...prev, ...newMovies] : newMovies))
        setHasMore(newMovies.length === PAGE_LIMIT)
      } catch (error) {
        console.error('Failed to load movies:', error)
        setHasMore(false)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [tags, contentType],
  )

  useEffect(() => {
    setPage(0)
    setMovies([])
    setHasMore(true)
    void loadMovies(selectedTag, 0, false)
  }, [selectedTag, loadMovies])

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore,
    loading,
    page,
    onLoadMore: (nextPage) => {
      setPage(nextPage)
      void loadMovies(selectedTag, nextPage * PAGE_LIMIT, true)
    },
  })

  return {
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  }
}

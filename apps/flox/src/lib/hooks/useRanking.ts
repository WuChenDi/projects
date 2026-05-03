import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'

export interface RankingMovie {
  id: string
  title: string
  cover_url: string
  score: string // e.g. "9.7"
  rating?: [string, string] // e.g. ["9.7", "50"] (score, weight)
  vote_count: number
  types: string[]
  regions: string[]
  release_date: string
  actor_count: number
  rank: number
  actors?: string[]
  url?: string
  is_playable?: boolean
}

export interface RankingCategory {
  id: string
  typeId: string
  label: string
}

export const RANKING_CATEGORIES: RankingCategory[] = [
  { id: 'drama', typeId: '11', label: '剧情' },
  { id: 'comedy', typeId: '24', label: '喜剧' },
  { id: 'action', typeId: '5', label: '动作' },
  { id: 'romance', typeId: '13', label: '爱情' },
  { id: 'scifi', typeId: '17', label: '科幻' },
  { id: 'animation', typeId: '25', label: '动画' },
  { id: 'suspense', typeId: '10', label: '悬疑' },
  { id: 'thriller', typeId: '19', label: '惊悚' },
  { id: 'horror', typeId: '20', label: '恐怖' },
  { id: 'crime', typeId: '22', label: '犯罪' },
  { id: 'fantasy', typeId: '7', label: '奇幻' },
  { id: 'war', typeId: '22', label: '战争' },
  { id: 'biography', typeId: '1', label: '传记' },
  { id: 'history', typeId: '4', label: '历史' },
  { id: 'music', typeId: '14', label: '音乐' },
  { id: 'adventure', typeId: '15', label: '冒险' },
  { id: 'documentary', typeId: '31', label: '纪录片' },
]

const PAGE_LIMIT = 20

export function useRanking() {
  const [selectedCategory, setSelectedCategory] = useState(
    RANKING_CATEGORIES[0],
  )
  const [movies, setMovies] = useState<RankingMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const loadingRef = useRef(false)

  const loadMovies = useCallback(
    async (typeId: string, start: number, append = false) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)

      try {
        const params = new URLSearchParams()
        params.set('type', typeId)
        params.set('start', start.toString())
        params.set('limit', PAGE_LIMIT.toString())

        const response = await fetch(`/api/douban/ranking?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch')

        const data: RankingMovie[] = await response.json()

        setMovies((prev) => (append ? [...prev, ...data] : data))
        setHasMore(data.length === PAGE_LIMIT)
      } catch (error) {
        console.error('Failed to load ranking:', error)
        setHasMore(false)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setPage(0)
    setMovies([])
    setHasMore(true)
    void loadMovies(selectedCategory.typeId, 0, false)
  }, [selectedCategory, loadMovies])

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore,
    loading,
    page,
    onLoadMore: (nextPage) => {
      setPage(nextPage)
      void loadMovies(selectedCategory.typeId, nextPage * PAGE_LIMIT, true)
    },
  })

  return {
    selectedCategory,
    setSelectedCategory,
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  }
}

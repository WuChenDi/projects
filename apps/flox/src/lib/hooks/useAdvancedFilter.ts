import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'

interface FilteredMovie {
  id: string
  title: string
  cover: string
  rate: string
  url: string
  cover_x?: number
  cover_y?: number
}

export interface FilterState {
  sort: 'T' | 'R' | 'S' // 热度 / 最新 / 评分
  tags: string // "电影" or "电视剧"
  genres: string
  countries: string
  scoreRange: [number, number]
}

const PAGE_LIMIT = 20

const DEFAULT_FILTER: FilterState = {
  sort: 'T',
  tags: '电影',
  genres: '',
  countries: '',
  scoreRange: [0, 10],
}

export const GENRE_OPTIONS = [
  '剧情', '喜剧', '动作', '爱情', '科幻', '动画',
  '悬疑', '惊悚', '恐怖', '犯罪', '奇幻', '战争',
  '音乐', '传记', '历史', '家庭', '冒险', '武侠',
  '纪录片', '短片',
]

export const COUNTRY_OPTIONS = [
  '中国大陆', '美国', '中国香港', '日本', '韩国',
  '中国台湾', '英国', '法国', '德国', '泰国',
  '印度', '意大利', '西班牙', '加拿大', '澳大利亚',
]

export const SORT_OPTIONS = [
  { value: 'T' as const, label: '热度' },
  { value: 'R' as const, label: '最新' },
  { value: 'S' as const, label: '评分' },
]

export function useAdvancedFilter(contentType: 'movie' | 'tv') {
  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    tags: contentType === 'tv' ? '电视剧' : '电影',
  })
  const [movies, setMovies] = useState<FilteredMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const loadingRef = useRef(false)

  const loadMovies = useCallback(
    async (f: FilterState, start: number, append = false) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)

      try {
        const params = new URLSearchParams()
        params.set('sort', f.sort)
        params.set('tags', f.tags)
        if (f.genres) params.set('genres', f.genres)
        if (f.countries) params.set('countries', f.countries)
        params.set('range', `${f.scoreRange[0]},${f.scoreRange[1]}`)
        params.set('start', start.toString())
        params.set('limit', PAGE_LIMIT.toString())

        const response = await fetch(`/api/douban/filter?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        const newMovies: FilteredMovie[] = (data.data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          cover: item.cover,
          rate: item.rate || '',
          url: item.url || '',
        }))

        setMovies((prev) => (append ? [...prev, ...newMovies] : newMovies))
        setHasMore(newMovies.length === PAGE_LIMIT)
      } catch (error) {
        console.error('Failed to load filtered movies:', error)
        setHasMore(false)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [],
  )

  // Reset and fetch when filter or contentType changes
  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      tags: contentType === 'tv' ? '电视剧' : '电影',
    }))
  }, [contentType])

  useEffect(() => {
    setPage(0)
    setMovies([])
    setHasMore(true)
    void loadMovies(filter, 0, false)
  }, [filter, loadMovies])

  const updateFilter = useCallback((partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }))
  }, [])

  const { prefetchRef, loadMoreRef } = useInfiniteScroll({
    hasMore,
    loading,
    page,
    onLoadMore: (nextPage) => {
      setPage(nextPage)
      void loadMovies(filter, nextPage * PAGE_LIMIT, true)
    },
  })

  return {
    filter,
    updateFilter,
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import type { Video } from '@/lib/types'

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
  '剧情',
  '喜剧',
  '动作',
  '爱情',
  '科幻',
  '动画',
  '悬疑',
  '惊悚',
  '恐怖',
  '犯罪',
  '奇幻',
  '战争',
  '音乐',
  '传记',
  '历史',
  '家庭',
  '冒险',
  '武侠',
  '纪录片',
  '短片',
]

export const COUNTRY_OPTIONS = [
  '中国大陆',
  '美国',
  '中国香港',
  '日本',
  '韩国',
  '中国台湾',
  '英国',
  '法国',
  '德国',
  '泰国',
  '印度',
  '意大利',
  '西班牙',
  '加拿大',
  '澳大利亚',
]

export const SORT_OPTIONS = [
  { value: 'T' as const, label: '热度' },
  { value: 'R' as const, label: '最新' },
  { value: 'S' as const, label: '评分' },
]

export interface FilterPreset {
  label: string
  filter: Partial<FilterState>
  /** Whether this preset comes from the Douban API (dynamic) */
  dynamic?: boolean
}

// Static combo presets (these don't exist as single Douban tags)
const COMBO_PRESETS: FilterPreset[] = [
  {
    label: '高分佳作',
    filter: { sort: 'S', genres: '', countries: '', scoreRange: [8, 10] },
  },
  {
    label: '华语喜剧',
    filter: {
      sort: 'T',
      genres: '喜剧',
      countries: '中国大陆',
      scoreRange: [0, 10],
    },
  },
  {
    label: '欧美科幻',
    filter: {
      sort: 'T',
      genres: '科幻',
      countries: '美国',
      scoreRange: [0, 10],
    },
  },
  {
    label: '日本动画',
    filter: {
      sort: 'T',
      genres: '动画',
      countries: '日本',
      scoreRange: [0, 10],
    },
  },
  {
    label: '韩国爱情',
    filter: {
      sort: 'T',
      genres: '爱情',
      countries: '韩国',
      scoreRange: [0, 10],
    },
  },
  {
    label: '经典悬疑',
    filter: { sort: 'S', genres: '悬疑', countries: '', scoreRange: [8, 10] },
  },
]

/**
 * Map a Douban tag label to a filter preset.
 * Some tags map to sort, some to genre, some to region.
 */
function tagToPreset(tag: string): FilterPreset {
  // Sort-like tags
  const sortMap: Record<string, FilterState['sort']> = {
    热门: 'T',
    最新: 'R',
    豆瓣高分: 'S',
    经典: 'S',
  }
  if (sortMap[tag]) {
    return {
      label: tag,
      filter: {
        sort: sortMap[tag],
        genres: '',
        countries: '',
        scoreRange: [0, 10],
      },
      dynamic: true,
    }
  }

  // Genre-like tags
  if (GENRE_OPTIONS.includes(tag)) {
    return {
      label: tag,
      filter: { sort: 'T', genres: tag, countries: '', scoreRange: [0, 10] },
      dynamic: true,
    }
  }

  // Country-like tags
  if (COUNTRY_OPTIONS.includes(tag)) {
    return {
      label: tag,
      filter: { sort: 'T', genres: '', countries: tag, scoreRange: [0, 10] },
      dynamic: true,
    }
  }

  // Fallback: treat as genre
  return {
    label: tag,
    filter: { sort: 'T', genres: tag, countries: '', scoreRange: [0, 10] },
    dynamic: true,
  }
}

export function useAdvancedFilter(contentType: 'movie' | 'tv') {
  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    tags: contentType === 'tv' ? '电视剧' : '电影',
  })
  const [presets, setPresets] = useState<FilterPreset[]>(COMBO_PRESETS)
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [movies, setMovies] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const loadingRef = useRef(false)

  // Fetch dynamic tags from Douban API
  useEffect(() => {
    const fetchTags = async () => {
      setPresetsLoading(true)
      try {
        const response = await fetch(`/api/douban/tags?type=${contentType}`)
        const data = await response.json()
        if (data.tags && Array.isArray(data.tags)) {
          const dynamicPresets = (data.tags as string[]).map(tagToPreset)
          // Deduplicate: remove combo presets whose label already exists in dynamic
          const dynamicLabels = new Set(dynamicPresets.map((p) => p.label))
          const uniqueCombos = COMBO_PRESETS.filter(
            (p) => !dynamicLabels.has(p.label),
          )
          setPresets([...dynamicPresets, ...uniqueCombos])
        }
      } catch (error) {
        console.error('Failed to fetch tags for presets:', error)
        // Fallback to static combo presets
      } finally {
        setPresetsLoading(false)
      }
    }
    void fetchTags()
  }, [contentType])

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
        const newMovies: Video[] = (data.data || []).map((item: any) => ({
          vod_id: item.id,
          vod_name: item.title,
          vod_pic: item.cover,
          vod_remarks:
            item.rate && parseFloat(item.rate) > 0
              ? `⭐ ${item.rate}`
              : undefined,
          source: 'douban',
          sourceName: '豆瓣',
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
    onLoadMore: () => {
      const nextPage = page + 1
      setPage(nextPage)
      void loadMovies(filter, nextPage * PAGE_LIMIT, true)
    },
  })

  return {
    filter,
    updateFilter,
    presets,
    presetsLoading,
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  }
}

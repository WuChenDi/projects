'use client'

import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import type { SortOption } from '@/lib/store/settings-store'
import { useSettingsStore } from '@/lib/store/settings-store'
import type { SourceBadge, Video } from '@/lib/types'
import { processSearchStream } from '@/lib/utils/search-stream'
import { sortVideos } from '@/lib/utils/sort'
import { binaryInsertVideos } from '@/lib/utils/sorted-insert'

interface ParallelSearchResult {
  loading: boolean
  results: Video[]
  availableSources: SourceBadge[]
  completedSources: number
  totalSources: number
  totalVideosFound: number
  performSearch: (
    query: string,
    sources?: any[],
    sortBy?: SortOption,
  ) => Promise<void>
  resetSearch: () => void
  loadCachedResults: (results: Video[], sources: any[]) => void
  applySorting: (sortBy: SortOption) => void
}

export function useParallelSearch(
  onCacheUpdate: (query: string, results: any[], sources: any[]) => void,
  onUrlUpdate: (query: string) => void,
): ParallelSearchResult {
  // Incremental SSE results need local state — react-query doesn't support streaming
  const [results, setResults] = useState<Video[]>([])
  const [availableSources, setAvailableSources] = useState<SourceBadge[]>([])
  const [completedSources, setCompletedSources] = useState(0)
  const [totalSources, setTotalSources] = useState(0)
  const [totalVideosFound, setTotalVideosFound] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ['search'],
    mutationFn: async ({
      query,
      sources,
      sortBy,
    }: {
      query: string
      sources: any[]
      sortBy: SortOption
    }) => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/search-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sources }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error('Search failed')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const sourcesMap = new Map<string, { count: number; name: string }>()

      await processSearchStream({
        reader,
        currentQuery: query,
        onStart: (total) => setTotalSources(total),
        onVideos: (newVideos, sourceId) => {
          setResults((prev) => binaryInsertVideos(prev, newVideos))
          if (!sourcesMap.has(sourceId)) {
            sourcesMap.set(sourceId, {
              count: newVideos.length,
              name: newVideos[0]?.sourceName || sourceId,
            })
          }
        },
        onProgress: (completed, found) => {
          setCompletedSources(completed)
          setTotalVideosFound(found)
        },
        onComplete: () => {},
        onError: (message) => console.error('Search error:', message),
      })

      return { sourcesMap, sortBy, query }
    },
    onSuccess: ({ sourcesMap, sortBy, query }) => {
      const sources = Array.from(sourcesMap.entries()).map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count,
      }))
      setAvailableSources(sources)
      setResults((current) => {
        const sorted = sortVideos(current, sortBy)
        setTimeout(() => onCacheUpdate(query, sorted, sources), 100)
        return sorted
      })
    },
  })

  const performSearch = useCallback(
    async (
      searchQuery: string,
      sources: any[] = [],
      sortBy: SortOption = 'default',
    ) => {
      if (!searchQuery.trim()) return

      let targetSources = sources
      if (!targetSources.length) {
        const settings = useSettingsStore.getState()
        targetSources = [
          ...settings.sources,
          ...settings.subscriptions.filter((s) => (s as any).enabled !== false),
        ].filter((s) => (s as any).enabled !== false)
      }

      setResults([])
      setAvailableSources([])
      setCompletedSources(0)
      setTotalSources(0)
      setTotalVideosFound(0)
      onUrlUpdate(searchQuery)

      try {
        await mutateAsync({
          query: searchQuery.trim(),
          sources: targetSources,
          sortBy,
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search error:', error)
        }
      }
    },
    [mutateAsync, onUrlUpdate],
  )

  const resetSearch = useCallback(() => {
    abortControllerRef.current?.abort()
    setResults([])
    setAvailableSources([])
    setCompletedSources(0)
    setTotalSources(0)
    setTotalVideosFound(0)
  }, [])

  const loadCachedResults = useCallback(
    (cachedResults: Video[], cachedSources: any[]) => {
      setResults(cachedResults)
      setAvailableSources(cachedSources)
      setTotalVideosFound(cachedResults.length)
    },
    [],
  )

  const applySorting = useCallback((sortBy: SortOption) => {
    setResults((current) => sortVideos(current, sortBy))
  }, [])

  return {
    loading: isPending,
    results,
    availableSources,
    completedSources,
    totalSources,
    totalVideosFound,
    performSearch,
    resetSearch,
    loadCachedResults,
    applySorting,
  }
}

import { useCallback, useRef, useState } from 'react'
import type { SourceBadge, Video } from '@/lib/types'

export function useSearchState() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Video[]>([])
  const [availableSources, setAvailableSources] = useState<SourceBadge[]>([])
  const [completedSources, setCompletedSources] = useState(0)
  const [totalSources, setTotalSources] = useState(0)
  const [totalVideosFound, setTotalVideosFound] = useState(0)
  const currentQueryRef = useRef<string>('')

  const resetState = useCallback(() => {
    setLoading(false)
    setResults([])
    setAvailableSources([])
    setCompletedSources(0)
    setTotalSources(0)
    setTotalVideosFound(0)
    currentQueryRef.current = ''
  }, [])

  const startSearch = useCallback((query: string) => {
    setLoading(true)
    setResults([])
    setAvailableSources([])
    setCompletedSources(0)
    setTotalSources(0)
    setTotalVideosFound(0)
    currentQueryRef.current = query
  }, [])

  return {
    loading,
    setLoading,
    results,
    setResults,
    availableSources,
    setAvailableSources,
    completedSources,
    setCompletedSources,
    totalSources,
    setTotalSources,
    totalVideosFound,
    setTotalVideosFound,
    currentQueryRef,
    resetState,
    startSearch,
  }
}

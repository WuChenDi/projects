import { useCallback, useEffect, useRef, useState } from 'react'

export interface DoubanSuggestion {
  id: string
  title: string
  img: string
  url: string
  year?: string
  sub_title?: string
  type?: string
  episode?: string
}

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 1

export function useSearchSuggestions() {
  const [suggestions, setSuggestions] = useState<DoubanSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = useCallback((query: string) => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(
          `/api/douban/suggest?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        )

        if (!response.ok) throw new Error('Failed to fetch suggestions')

        const data: DoubanSuggestion[] = await response.json()
        setSuggestions(data)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return { suggestions, loading, fetchSuggestions, clearSuggestions }
}

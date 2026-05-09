import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParallelSearch } from '@/lib/hooks/useParallelSearch'
import { useSearchCache } from '@/lib/hooks/useSearchCache'
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync'
import { useSettingsStore } from '@/lib/store/settings-store'

interface UseHomePageOptions {
  isPremium?: boolean
}

export function useHomePage({ isPremium = false }: UseHomePageOptions = {}) {
  useSubscriptionSync()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loadFromCache, saveToCache } = useSearchCache()
  const hasSearchedWithSourcesRef = useRef(false)
  const isInitialCacheLoad = useRef(false)

  const basePath = isPremium ? '/premium' : '/'

  const [query, setQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const storedSortBy = useSettingsStore((s) => s.sortBy)
  const sources = useSettingsStore((s) => s.sources)
  const premiumSources = useSettingsStore((s) => s.premiumSources)
  // Premium mode keeps an independent (non-persisted) sort selection.
  const currentSortBy = isPremium ? 'default' : storedSortBy

  const enabledSources = useMemo(
    () => (isPremium ? premiumSources : sources).filter((s) => s.enabled),
    [isPremium, sources, premiumSources],
  )

  const onUrlUpdate = useCallback(
    (q: string) => {
      router.replace(`${basePath}?q=${encodeURIComponent(q)}`, {
        scroll: false,
      })
    },
    [router, basePath],
  )

  const {
    loading,
    results,
    availableSources,
    completedSources,
    totalSources,
    performSearch,
    resetSearch,
    loadCachedResults,
    applySorting,
  } = useParallelSearch(saveToCache, onUrlUpdate)

  const executeSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return false
      if (enabledSources.length === 0) return false

      void performSearch(searchQuery, enabledSources, currentSortBy)
      hasSearchedWithSourcesRef.current = true
      return true
    },
    [performSearch, enabledSources, currentSortBy],
  )

  // Re-sort results when sort preference changes
  useEffect(() => {
    if (hasSearched && results.length > 0 && !isInitialCacheLoad.current) {
      applySorting(currentSortBy)
    }
  }, [currentSortBy, applySorting, hasSearched, results.length])

  // Re-trigger search when sources become available after initial load
  useEffect(() => {
    if (
      query &&
      enabledSources.length > 0 &&
      !hasSearchedWithSourcesRef.current &&
      !loading
    ) {
      if (executeSearch(query)) {
        setHasSearched(true)
      }
    }
  }, [query, loading, executeSearch, enabledSources])

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return

      const scrollKey = `scroll-pos:${basePath}?q=${encodeURIComponent(searchQuery)}`
      sessionStorage.removeItem(scrollKey)

      const cached = loadFromCache(searchQuery)
      if (cached && cached.results.length > 0) {
        isInitialCacheLoad.current = true
        setQuery(searchQuery)
        setHasSearched(true)
        loadCachedResults(cached.results, cached.availableSources)
        onUrlUpdate(searchQuery)
        return
      }

      isInitialCacheLoad.current = false
      setQuery(searchQuery)
      setHasSearched(true)
      executeSearch(searchQuery)
    },
    [executeSearch, basePath, loadFromCache, loadCachedResults, onUrlUpdate],
  )

  const urlQuery = searchParams.get('q') || ''

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleSearch/loadFromCache/loadCachedResults cause loops
  useEffect(() => {
    if (!urlQuery) return
    if (urlQuery === query && hasSearched) return

    setQuery(urlQuery)

    if (!isPremium) {
      const cached = loadFromCache(urlQuery)
      if (cached && cached.results.length > 0) {
        isInitialCacheLoad.current = true
        setHasSearched(true)
        loadCachedResults(cached.results, cached.availableSources)
        hasSearchedWithSourcesRef.current = true
        return
      }
    }

    if (enabledSources.length > 0) {
      handleSearch(urlQuery)
    }
  }, [urlQuery])

  const handleReset = useCallback(() => {
    setHasSearched(false)
    setQuery('')
    hasSearchedWithSourcesRef.current = false
    resetSearch()
    router.replace(basePath, { scroll: false })
  }, [resetSearch, router, basePath])

  return {
    query,
    hasSearched,
    loading,
    results,
    availableSources,
    completedSources,
    totalSources,
    handleSearch,
    handleReset,
  }
}

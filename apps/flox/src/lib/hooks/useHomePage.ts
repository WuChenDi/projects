import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParallelSearch } from '@/lib/hooks/useParallelSearch'
import { useSearchCache } from '@/lib/hooks/useSearchCache'
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync'
import type { SortOption } from '@/lib/store/settings-store'
import { settingsStore } from '@/lib/store/settings-store'

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
  const [currentSortBy, setCurrentSortBy] = useState<SortOption>('default')

  const getEnabledSources = useCallback(() => {
    const settings = settingsStore.getSettings()
    return isPremium
      ? settings.premiumSources.filter((s) => s.enabled)
      : settings.sources.filter((s) => s.enabled)
  }, [isPremium])

  const onUrlUpdate = useCallback(
    (q: string) => {
      router.replace(`${basePath}?q=${encodeURIComponent(q)}`, {
        scroll: false,
      })
    },
    [router, basePath],
  )

  // Search stream hook
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

  // Core search execution function
  const executeSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return false

      const enabledSources = getEnabledSources()
      if (enabledSources.length === 0) return false

      const settings = settingsStore.getSettings()
      void performSearch(
        searchQuery,
        enabledSources,
        isPremium ? currentSortBy : settings.sortBy,
      )
      hasSearchedWithSourcesRef.current = true
      return true
    },
    [performSearch, getEnabledSources, isPremium, currentSortBy],
  )

  // Re-sort results when sort preference changes
  useEffect(() => {
    if (hasSearched && results.length > 0 && !isInitialCacheLoad.current) {
      applySorting(currentSortBy)
    }
  }, [currentSortBy, applySorting, hasSearched, results.length])

  // Subscribe to settings changes (source loading, sort preference)
  useEffect(() => {
    const updateSettings = () => {
      const settings = settingsStore.getSettings()

      // Sync sort preference (normal mode uses store value)
      if (!isPremium && settings.sortBy !== currentSortBy) {
        setCurrentSortBy(settings.sortBy)
      }

      // Re-trigger search when sources become available after initial load
      const enabledSources = getEnabledSources()
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
    }

    updateSettings()

    const unsubscribe = settingsStore.subscribe(updateSettings)
    return () => unsubscribe()
  }, [query, loading, executeSearch, currentSortBy, isPremium, getEnabledSources])

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return

      // Clear scroll position for fresh search
      const scrollKey = `scroll-pos:${basePath}?q=${encodeURIComponent(searchQuery)}`
      sessionStorage.removeItem(scrollKey)

      isInitialCacheLoad.current = false

      setQuery(searchQuery)
      setHasSearched(true)
      executeSearch(searchQuery)
    },
    [executeSearch, basePath],
  )

  // Sync search state with URL query parameter
  const urlQuery = searchParams.get('q') || ''

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleSearch/loadFromCache/loadCachedResults cause loops
  useEffect(() => {
    if (!urlQuery) return
    if (urlQuery === query && hasSearched) return

    setQuery(urlQuery)

    // Try loading from cache (normal mode only)
    if (!isPremium) {
      const cached = loadFromCache()
      if (cached && cached.query === urlQuery && cached.results.length > 0) {
        isInitialCacheLoad.current = true
        setHasSearched(true)
        loadCachedResults(cached.results, cached.availableSources)
        hasSearchedWithSourcesRef.current = true
        return
      }
    }

    // Execute search if sources are ready
    const enabledSources = getEnabledSources()
    if (enabledSources.length > 0) {
      handleSearch(urlQuery)
    }
    // If no sources yet, the subscription effect will catch it
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

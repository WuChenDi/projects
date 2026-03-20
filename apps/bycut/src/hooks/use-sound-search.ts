import { useEffect, useMemo } from 'react'
import { STATIC_SOUND_EFFECTS } from '@/constants/sounds-data'
import { useSoundsStore } from '@/stores/sounds-store'

export function useSoundSearch({
  query,
  commercialOnly,
}: {
  query: string
  commercialOnly: boolean
}) {
  const {
    searchResults,
    isSearching,
    searchError,
    setSearchResults,
    setSearching,
    setSearchError,
  } = useSoundsStore()

  const COMMERCIAL_LICENSES = useMemo(
    () => [
      'http://creativecommons.org/publicdomain/zero/1.0/',
      'https://creativecommons.org/licenses/by/4.0/',
    ],
    [],
  )

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults({ results: [] })
      setSearchError({ error: null })
      return
    }

    setSearching({ searching: true })

    const timeoutId = setTimeout(() => {
      const lowerQuery = query.toLowerCase()
      const filtered = STATIC_SOUND_EFFECTS.filter((sound) => {
        const matchesQuery =
          sound.name.toLowerCase().includes(lowerQuery) ||
          sound.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          sound.username.toLowerCase().includes(lowerQuery)

        if (!matchesQuery) return false

        if (commercialOnly) {
          return COMMERCIAL_LICENSES.includes(sound.license)
        }

        return true
      })

      setSearchResults({ results: filtered })
      setSearching({ searching: false })
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [
    query,
    commercialOnly,
    COMMERCIAL_LICENSES,
    setSearchResults,
    setSearching,
    setSearchError,
  ])

  return {
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    loadMore: () => {},
    hasNextPage: false,
    isLoadingMore: false,
    totalCount: searchResults.length,
  }
}

/**
 * Search History Store - Persists recent search queries (normal + premium).
 */

import { createPersistedStore } from './create-persisted-store'

const MAX_HISTORY_ITEMS = 20

export interface SearchHistoryItem {
  query: string
  timestamp: number
  resultCount?: number
}

interface SearchHistoryState {
  searchHistory: SearchHistoryItem[]
}

interface SearchHistoryActions {
  addToSearchHistory: (query: string, resultCount?: number) => void
  removeFromSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  getRecentSearches: (limit?: number) => SearchHistoryItem[]
}

const normalizeQuery = (q: string) => q.trim().toLowerCase()

const createSearchHistoryStore = (key: string) =>
  createPersistedStore<SearchHistoryState, SearchHistoryActions>({
    key,
    defaultState: () => ({ searchHistory: [] }),
    actions: (set, get) => ({
      addToSearchHistory: (query, resultCount) => {
        const trimmed = query.trim()
        if (!trimmed) return
        const normalized = normalizeQuery(trimmed)
        const timestamp = Date.now()

        set((state) => {
          const existingIndex = state.searchHistory.findIndex(
            (item) => normalizeQuery(item.query) === normalized,
          )
          let next: SearchHistoryItem[]

          if (existingIndex !== -1) {
            const updated: SearchHistoryItem = {
              query: trimmed,
              timestamp,
              resultCount,
            }
            next = [
              updated,
              ...state.searchHistory.filter((_, i) => i !== existingIndex),
            ]
          } else {
            next = [
              { query: trimmed, timestamp, resultCount },
              ...state.searchHistory,
            ]
          }

          if (next.length > MAX_HISTORY_ITEMS) {
            next = next.slice(0, MAX_HISTORY_ITEMS)
          }
          return { searchHistory: next }
        })
      },

      removeFromSearchHistory: (query) => {
        const normalized = normalizeQuery(query)
        set((state) => ({
          searchHistory: state.searchHistory.filter(
            (item) => normalizeQuery(item.query) !== normalized,
          ),
        }))
      },

      clearSearchHistory: () => set({ searchHistory: [] }),

      getRecentSearches: (limit = 10) => get().searchHistory.slice(0, limit),
    }),
  })

export const useSearchHistoryStore = createSearchHistoryStore(
  'flox:search-history',
)
export const usePremiumSearchHistoryStore = createSearchHistoryStore(
  'flox:search-history:premium',
)

export function useSearchHistory(isPremium = false) {
  const normalStore = useSearchHistoryStore()
  const premiumStore = usePremiumSearchHistoryStore()
  return isPremium ? premiumStore : normalStore
}

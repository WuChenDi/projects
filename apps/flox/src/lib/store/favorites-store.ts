/**
 * Favorites Store - Manages user's favorite videos.
 */

import type { FavoriteItem } from '@/lib/types'
import { createPersistedStore } from './create-persisted-store'

const MAX_FAVORITES = 100

interface FavoritesState {
  favorites: FavoriteItem[]
}

interface FavoritesActions {
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void
  removeFavorite: (videoId: string | number, source: string) => void
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => boolean
  isFavorite: (videoId: string | number, source: string) => boolean
  clearFavorites: () => void
  importFavorites: (favorites: FavoriteItem[]) => void
}

function favoriteId(videoId: string | number, source: string): string {
  return `${source}:${videoId}`
}

const createFavoritesStore = (key: string) =>
  createPersistedStore<FavoritesState, FavoritesActions>({
    key,
    defaultState: () => ({ favorites: [] }),
    actions: (set, get) => ({
      addFavorite: (item) => {
        const id = favoriteId(item.videoId, item.source)
        set((state) => {
          if (
            state.favorites.some((f) => favoriteId(f.videoId, f.source) === id)
          ) {
            return state
          }
          const next: FavoriteItem = { ...item, addedAt: Date.now() }
          let list = [next, ...state.favorites]
          if (list.length > MAX_FAVORITES) list = list.slice(0, MAX_FAVORITES)
          return { favorites: list }
        })
      },

      removeFavorite: (videoId, source) => {
        const id = favoriteId(videoId, source)
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => favoriteId(f.videoId, f.source) !== id,
          ),
        }))
      },

      toggleFavorite: (item) => {
        const id = favoriteId(item.videoId, item.source)
        const exists = get().favorites.some(
          (f) => favoriteId(f.videoId, f.source) === id,
        )
        if (exists) {
          get().removeFavorite(item.videoId, item.source)
          return false
        }
        get().addFavorite(item)
        return true
      },

      isFavorite: (videoId, source) => {
        const id = favoriteId(videoId, source)
        return get().favorites.some(
          (f) => favoriteId(f.videoId, f.source) === id,
        )
      },

      clearFavorites: () => set({ favorites: [] }),
      importFavorites: (favorites) => set({ favorites }),
    }),
  })

export const useFavoritesStore = createFavoritesStore('flox:favorites')
export const usePremiumFavoritesStore = createFavoritesStore(
  'flox:favorites:premium',
)

export function useFavorites(isPremium = false) {
  const useStore = isPremium ? usePremiumFavoritesStore : useFavoritesStore
  return useStore()
}

/** Subscribe to a single item's favorite status — re-renders only when this item toggles. */
export function useIsFavorite(
  videoId: string | number,
  source: string,
  isPremium = false,
) {
  const useStore = isPremium ? usePremiumFavoritesStore : useFavoritesStore
  const id = favoriteId(videoId, source)
  return useStore((s) =>
    s.favorites.some((f) => favoriteId(f.videoId, f.source) === id),
  )
}

/** Stable `toggleFavorite` action without subscribing to the favorites list. */
export function useToggleFavorite(isPremium = false) {
  const useStore = isPremium ? usePremiumFavoritesStore : useFavoritesStore
  return useStore((s) => s.toggleFavorite)
}

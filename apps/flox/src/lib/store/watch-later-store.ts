import type { WatchLaterItem } from '@/lib/types'
import { createPersistedStore } from './create-persisted-store'

const MAX_WATCH_LATER = 100

interface WatchLaterState {
  items: WatchLaterItem[]
}

interface WatchLaterActions {
  addToWatchLater: (item: Omit<WatchLaterItem, 'addedAt'>) => void
  removeFromWatchLater: (videoId: string | number, source: string) => void
  toggleWatchLater: (item: Omit<WatchLaterItem, 'addedAt'>) => boolean
  isInWatchLater: (videoId: string | number, source: string) => boolean
  clearWatchLater: () => void
}

const itemId = (videoId: string | number, source: string) =>
  `${source}:${videoId}`

const createWatchLaterStore = (key: string) =>
  createPersistedStore<WatchLaterState, WatchLaterActions>({
    key,
    defaultState: () => ({ items: [] }),
    actions: (set, get) => ({
      addToWatchLater: (item) => {
        const id = itemId(item.videoId, item.source)
        set((state) => {
          if (state.items.some((i) => itemId(i.videoId, i.source) === id)) {
            return state
          }
          const list = [{ ...item, addedAt: Date.now() }, ...state.items]
          return { items: list.slice(0, MAX_WATCH_LATER) }
        })
      },

      removeFromWatchLater: (videoId, source) => {
        const id = itemId(videoId, source)
        set((state) => ({
          items: state.items.filter((i) => itemId(i.videoId, i.source) !== id),
        }))
      },

      toggleWatchLater: (item) => {
        const id = itemId(item.videoId, item.source)
        const exists = get().items.some(
          (i) => itemId(i.videoId, i.source) === id,
        )
        if (exists) {
          get().removeFromWatchLater(item.videoId, item.source)
          return false
        }
        get().addToWatchLater(item)
        return true
      },

      isInWatchLater: (videoId, source) => {
        const id = itemId(videoId, source)
        return get().items.some((i) => itemId(i.videoId, i.source) === id)
      },

      clearWatchLater: () => set({ items: [] }),
    }),
  })

export const useWatchLaterStore = createWatchLaterStore('flox:watch-later')
export const usePremiumWatchLaterStore = createWatchLaterStore(
  'flox:watch-later:premium',
)

export function useWatchLater(isPremium = false) {
  const useStore = isPremium ? usePremiumWatchLaterStore : useWatchLaterStore
  return useStore()
}

/** Subscribe to a single item's watch-later status — re-renders only when this item toggles. */
export function useIsInWatchLater(
  videoId: string | number,
  source: string,
  isPremium = false,
) {
  const useStore = isPremium ? usePremiumWatchLaterStore : useWatchLaterStore
  const id = itemId(videoId, source)
  return useStore((s) =>
    s.items.some((i) => itemId(i.videoId, i.source) === id),
  )
}

/** Stable `toggleWatchLater` action without subscribing to the items list. */
export function useToggleWatchLater(isPremium = false) {
  const useStore = isPremium ? usePremiumWatchLaterStore : useWatchLaterStore
  return useStore((s) => s.toggleWatchLater)
}

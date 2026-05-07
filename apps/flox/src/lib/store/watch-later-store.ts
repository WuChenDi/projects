import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchLaterItem } from '@/lib/types'

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

interface WatchLaterStore extends WatchLaterState, WatchLaterActions {}

function generateId(videoId: string | number, source: string): string {
  return `${source}:${videoId}`
}

const createWatchLaterStore = (name: string) =>
  create<WatchLaterStore>()(
    persist(
      (set, get) => ({
        items: [],

        addToWatchLater: (item) => {
          const id = generateId(item.videoId, item.source)
          set((state) => {
            if (state.items.some((i) => generateId(i.videoId, i.source) === id)) {
              return state
            }
            const newItems = [{ ...item, addedAt: Date.now() }, ...state.items]
            return { items: newItems.slice(0, MAX_WATCH_LATER) }
          })
        },

        removeFromWatchLater: (videoId, source) => {
          const id = generateId(videoId, source)
          set((state) => ({
            items: state.items.filter((i) => generateId(i.videoId, i.source) !== id),
          }))
        },

        toggleWatchLater: (item) => {
          const state = get()
          const id = generateId(item.videoId, item.source)
          const exists = state.items.some((i) => generateId(i.videoId, i.source) === id)
          if (exists) {
            state.removeFromWatchLater(item.videoId, item.source)
            return false
          }
          state.addToWatchLater(item)
          return true
        },

        isInWatchLater: (videoId, source) => {
          const id = generateId(videoId, source)
          return get().items.some((i) => generateId(i.videoId, i.source) === id)
        },

        clearWatchLater: () => set({ items: [] }),
      }),
      { name },
    ),
  )

export const useWatchLaterStore = createWatchLaterStore('flox-watch-later-store')
export const usePremiumWatchLaterStore = createWatchLaterStore('flox-premium-watch-later-store')

export function useWatchLater(isPremium = false) {
  const normalStore = useWatchLaterStore()
  const premiumStore = usePremiumWatchLaterStore()
  return isPremium ? premiumStore : normalStore
}

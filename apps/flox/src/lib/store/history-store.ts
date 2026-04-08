/**
 * History State Store using Zustand
 * Manages viewing history with localStorage persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Episode, VideoHistoryItem } from '@/lib/types'
import { clearAllCache, clearSegmentsForUrl } from '@/lib/utils/cacheManager'

const MAX_HISTORY_ITEMS = 50

interface HistoryState {
  viewingHistory: VideoHistoryItem[]
}

interface HistoryActions {
  addToHistory: (
    videoId: string | number,
    title: string,
    url: string,
    episodeIndex: number,
    source: string,
    playbackPosition: number,
    duration: number,
    poster?: string,
    episodes?: Episode[],
  ) => void

  removeFromHistory: (videoId: string | number, source: string) => void
  clearHistory: () => void
  importHistory: (history: VideoHistoryItem[]) => void
}

interface HistoryStore extends HistoryState, HistoryActions {}

/**
 * Generate unique identifier for deduplication
 */
function generateShowIdentifier(
  title: string,
  source: string,
  videoId: string | number,
): string {
  return `${source}:${videoId}:${title.toLowerCase().trim()}`
}

const createHistoryStore = (name: string) =>
  create<HistoryStore>()(
    persist(
      (set, get) => ({
        viewingHistory: [],

        addToHistory: (
          videoId,
          title,
          url,
          episodeIndex,
          source,
          playbackPosition,
          duration,
          poster,
          episodes = [],
        ) => {
          const showIdentifier = generateShowIdentifier(title, source, videoId)
          const timestamp = Date.now()

          set((state) => {
            // Check if item already exists
            const existingIndex = state.viewingHistory.findIndex(
              (item) => item.showIdentifier === showIdentifier,
            )

            let newHistory: VideoHistoryItem[]

            if (existingIndex !== -1) {
              // Update existing item and move to top
              const updatedItem: VideoHistoryItem = {
                ...state.viewingHistory[existingIndex],
                url,
                episodeIndex,
                playbackPosition,
                duration,
                timestamp,
                episodes:
                  episodes.length > 0
                    ? episodes
                    : state.viewingHistory[existingIndex].episodes,
              }

              newHistory = [
                updatedItem,
                ...state.viewingHistory.filter(
                  (_, index) => index !== existingIndex,
                ),
              ]
            } else {
              // Add new item at the top
              const newItem: VideoHistoryItem = {
                videoId,
                title,
                url,
                episodeIndex,
                source,
                timestamp,
                playbackPosition,
                duration,
                poster,
                episodes,
                showIdentifier,
              }

              newHistory = [newItem, ...state.viewingHistory]
            }

            // Limit history size
            if (newHistory.length > MAX_HISTORY_ITEMS) {
              newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS)
            }

            return { viewingHistory: newHistory }
          })
        },

        removeFromHistory: (videoId, source) => {
          const state = get()
          const itemToRemove = state.viewingHistory.find(
            (item) => item.videoId === videoId && item.source === source,
          )

          if (itemToRemove) {
            // Clear cache for this video
            void clearSegmentsForUrl(itemToRemove.url)
          }

          set((state) => ({
            viewingHistory: state.viewingHistory.filter(
              (item) => !(item.videoId === videoId && item.source === source),
            ),
          }))
        },

        clearHistory: () => {
          // Clear all cached segments
          void clearAllCache()
          set({ viewingHistory: [] })
        },

        importHistory: (history) => {
          set({ viewingHistory: history })
        },
      }),
      {
        name,
      },
    ),
  )

export const useHistoryStore = createHistoryStore('flox-history-store')
export const usePremiumHistoryStore = createHistoryStore(
  'flox-premium-history-store',
)

/**
 * Helper hook to get the appropriate history store
 */
export function useHistory(isPremium = false) {
  const normalStore = useHistoryStore()
  const premiumStore = usePremiumHistoryStore()
  return isPremium ? premiumStore : normalStore
}

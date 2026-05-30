/**
 * History Store - Viewing history persisted to localStorage.
 */

import type { Episode, VideoHistoryItem } from '@/lib/types'
import { clearAllCache, clearSegmentsForUrl } from '@/lib/utils/cacheManager'
import { createPersistedStore } from './create-persisted-store'

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

function showIdentifier(
  title: string,
  source: string,
  videoId: string | number,
): string {
  return `${source}:${videoId}:${title.toLowerCase().trim()}`
}

const createHistoryStore = (key: string) =>
  createPersistedStore<HistoryState, HistoryActions>({
    key,
    defaultState: () => ({ viewingHistory: [] }),
    actions: (set, get) => ({
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
        const sid = showIdentifier(title, source, videoId)
        const timestamp = Date.now()

        set((state) => {
          const existingIndex = state.viewingHistory.findIndex(
            (i) => i.showIdentifier === sid,
          )
          let next: VideoHistoryItem[]

          if (existingIndex !== -1) {
            const existing = state.viewingHistory[existingIndex]
            const isSameEpisode = existing.episodeIndex === episodeIndex
            const updated: VideoHistoryItem = {
              ...existing,
              url,
              episodeIndex,
              playbackPosition:
                isSameEpisode && playbackPosition === 0
                  ? existing.playbackPosition
                  : playbackPosition,
              duration:
                isSameEpisode && duration === 0 ? existing.duration : duration,
              timestamp,
              episodes: episodes.length > 0 ? episodes : existing.episodes,
            }
            next = [
              updated,
              ...state.viewingHistory.filter((_, i) => i !== existingIndex),
            ]
          } else {
            const item: VideoHistoryItem = {
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
              showIdentifier: sid,
            }
            next = [item, ...state.viewingHistory]
          }

          if (next.length > MAX_HISTORY_ITEMS) {
            next = next.slice(0, MAX_HISTORY_ITEMS)
          }
          return { viewingHistory: next }
        })
      },

      removeFromHistory: (videoId, source) => {
        const item = get().viewingHistory.find(
          (i) => i.videoId === videoId && i.source === source,
        )
        if (item) void clearSegmentsForUrl(item.url)

        set((state) => ({
          viewingHistory: state.viewingHistory.filter(
            (i) => !(i.videoId === videoId && i.source === source),
          ),
        }))
      },

      clearHistory: () => {
        void clearAllCache()
        set({ viewingHistory: [] })
      },

      importHistory: (history) => set({ viewingHistory: history }),
    }),
  })

export const useHistoryStore = createHistoryStore('flox:history')
export const usePremiumHistoryStore = createHistoryStore('flox:history:premium')

export function useHistory(isPremium = false) {
  const useStore = isPremium ? usePremiumHistoryStore : useHistoryStore
  return useStore()
}

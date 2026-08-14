import { StatusEnum } from '@cdlab/ui/IK/IKAssetRenderer'
import { logger } from '@cdlab/utils'
import { createIndexedDBStorage } from '@cdlab/zustand-idb'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  name?: string
  timestamp: string
  speaker: string
  text: string
  audioBlob?: Blob
  requestInfo: string
  status: StatusEnum
  error?: string
}

interface HistoryStore {
  history: HistoryItem[]
  addHistory: (item: HistoryItem) => void
  updateHistory: (id: string, updates: Partial<HistoryItem>) => void
  removeHistory: (id: string) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      history: [],

      addHistory: (item) =>
        set((state) => ({ history: [item, ...state.history] })),

      updateHistory: (id, updates) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        })),

      removeHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'bytts-results',
      // IndexedDB keeps the audio Blob itself, so no metadata/blob split.
      storage: createIndexedDBStorage('bytts', 'stores'),
      // IndexedDB is browser-only: hydrate on the client instead of during SSR.
      skipHydration: true,
      partialize: (state) => ({
        history: state.history.filter(
          (item) => item.status !== StatusEnum.PROCESSING,
        ),
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          logger.error('Failed to rehydrate history store:', error)
        }
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  void useHistoryStore.persist.rehydrate()
}

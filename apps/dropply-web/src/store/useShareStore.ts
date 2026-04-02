import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ShareResult {
  id: string
  retrievalCode: string
  encryptionKey: string
  shareUrl: string
  timestamp: number
}

interface ShareStore {
  results: ShareResult[]
  addResult: (result: ShareResult) => void
  removeResult: (id: string) => void
  clearResults: () => void
}

export const useShareStore = create<ShareStore>()(
  persist(
    (set) => ({
      results: [],

      addResult: (result) =>
        set((state) => ({
          results: [result, ...state.results],
        })),

      removeResult: (id) =>
        set((state) => ({
          results: state.results.filter((r) => r.id !== id),
        })),

      clearResults: () => set({ results: [] }),
    }),
    {
      name: 'dropply-share-results',
    },
  ),
)

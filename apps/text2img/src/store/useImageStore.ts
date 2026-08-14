import { logger } from '@cdlab/utils'
import { createIndexedDBStorage } from '@cdlab/zustand-idb'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GenerationResult } from '@/types'
import { GenerationStatus } from '@/types'

interface ImageStore {
  results: GenerationResult[]
  addResult: (result: GenerationResult) => void
  completeResult: (id: string, blob: Blob, generationTime: number) => void
  failResult: (id: string, error: string) => void
  removeResult: (id: string) => void
  clearAll: () => void
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set) => ({
      results: [],

      addResult: (result) =>
        set((state) => ({ results: [result, ...state.results] })),

      completeResult: (id, blob, generationTime) =>
        set((state) => ({
          results: state.results.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: GenerationStatus.COMPLETED,
                  blob,
                  imageUrl: URL.createObjectURL(blob),
                  generationTime,
                }
              : r,
          ),
        })),

      failResult: (id, error) =>
        set((state) => ({
          results: state.results.map((r) =>
            r.id === id ? { ...r, status: GenerationStatus.FAILED, error } : r,
          ),
        })),

      removeResult: (id) =>
        set((state) => {
          const target = state.results.find((r) => r.id === id)
          if (target?.imageUrl) {
            URL.revokeObjectURL(target.imageUrl)
          }
          return { results: state.results.filter((r) => r.id !== id) }
        }),

      clearAll: () =>
        set((state) => {
          for (const r of state.results) {
            if (r.imageUrl) {
              URL.revokeObjectURL(r.imageUrl)
            }
          }
          return { results: [] }
        }),
    }),
    {
      name: 'text2img-results',
      // IndexedDB holds the image Blob itself, so no metadata/blob split.
      storage: createIndexedDBStorage('text2img', 'stores'),
      // IndexedDB is browser-only: hydrate on the client instead of during SSR.
      skipHydration: true,
      // Only completed results are persisted. The object URL is session-only
      // (rebuilt from the blob on rehydrate), and large/sensitive params
      // (password, source/mask base64) are stripped before being written.
      partialize: (state) => ({
        results: state.results
          .filter((r) => r.status === GenerationStatus.COMPLETED)
          .map(({ imageUrl, params, ...rest }) => {
            const { password, image_b64, mask_b64, ...safeParams } = params
            return { ...rest, params: safeParams }
          }),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate image store:', error)
          return
        }
        if (!state) return
        useImageStore.setState({
          results: state.results.map((r) =>
            r.blob ? { ...r, imageUrl: URL.createObjectURL(r.blob) } : r,
          ),
        })
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  void useImageStore.persist.rehydrate()
}

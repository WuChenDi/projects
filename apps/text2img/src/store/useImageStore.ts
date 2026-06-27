import { logger } from '@cdlab996/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { imageStore } from '@/lib/storage'
import type { GenerationResult } from '@/types'
import { GenerationStatus } from '@/types'

interface ImageStore {
  results: GenerationResult[]
  addResult: (result: GenerationResult) => void
  completeResult: (id: string, blob: Blob, generationTime: number) => void
  failResult: (id: string, error: string) => void
  removeResult: (id: string) => void
  clearAll: () => void
  rehydrateBlobs: () => Promise<void>
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      results: [],

      addResult: (result) =>
        set((state) => ({ results: [result, ...state.results] })),

      completeResult: (id, blob, generationTime) => {
        imageStore.set(id, blob).catch((err) => logger.error(err))
        const imageUrl = URL.createObjectURL(blob)
        set((state) => ({
          results: state.results.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: GenerationStatus.COMPLETED,
                  imageUrl,
                  generationTime,
                }
              : r,
          ),
        }))
      },

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
          imageStore.remove(id).catch((err) => logger.error(err))
          return { results: state.results.filter((r) => r.id !== id) }
        }),

      clearAll: () =>
        set((state) => {
          for (const r of state.results) {
            if (r.imageUrl) {
              URL.revokeObjectURL(r.imageUrl)
            }
          }
          imageStore.clear().catch((err) => logger.error(err))
          return { results: [] }
        }),

      rehydrateBlobs: async () => {
        const { results } = get()
        const restoredMap = new Map<string, GenerationResult>()

        await Promise.all(
          results.map(async (result) => {
            try {
              const blob = await imageStore.get(result.id)
              if (!blob) {
                restoredMap.set(result.id, {
                  ...result,
                  status: GenerationStatus.FAILED,
                  error: 'Data lost',
                })
                return
              }
              restoredMap.set(result.id, {
                ...result,
                imageUrl: URL.createObjectURL(blob),
              })
            } catch {
              restoredMap.set(result.id, {
                ...result,
                status: GenerationStatus.FAILED,
                error: 'Data lost',
              })
            }
          }),
        )

        set((state) => ({
          results: state.results.map((r) => restoredMap.get(r.id) ?? r),
        }))
      },
    }),
    {
      name: 'text2img-results',
      // Only completed results are persisted. The object URL is session-only
      // (rebuilt from IndexedDB on rehydrate), and large/sensitive params
      // (password, source/mask base64) are stripped before hitting localStorage.
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
        state?.rehydrateBlobs().catch((err) => {
          logger.error('Blob rehydration failed:', err)
        })
      },
    },
  ),
)

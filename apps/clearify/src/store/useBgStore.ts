import { logger } from '@cdlab996/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { bgBlobStore } from '@/lib/storage'
import type { BgImageFile } from '@/types'

interface BgStore {
  images: BgImageFile[]
  isHydrated: boolean
  addImages: (images: BgImageFile[]) => void
  updateImage: (id: string, updates: Partial<BgImageFile>) => Promise<void>
  removeImage: (id: string) => void
  clearImages: () => void
  rehydrateBlobs: () => Promise<void>
}

export const useBgStore = create<BgStore>()(
  persist(
    (set, get) => ({
      images: [],
      isHydrated: false,

      addImages: (images) =>
        set((state) => ({ images: [...state.images, ...images] })),

      updateImage: async (id, updates) => {
        if (updates.processedBlob) {
          try {
            const buffer = await updates.processedBlob.arrayBuffer()
            await bgBlobStore.set(id, buffer)
          } catch (err) {
            logger.error('Failed to persist bg blob', err)
          }
        }
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, ...updates } : img,
          ),
        }))
      },

      removeImage: (id) => {
        const image = get().images.find((img) => img.id === id)
        if (image?.preview) URL.revokeObjectURL(image.preview)
        if (image?.processedUrl) URL.revokeObjectURL(image.processedUrl)
        bgBlobStore
          .remove(id)
          .catch((err) => logger.error('Failed to remove bg blob', err))
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }))
      },

      clearImages: () => {
        get().images.forEach((image) => {
          if (image.preview) URL.revokeObjectURL(image.preview)
          if (image.processedUrl) URL.revokeObjectURL(image.processedUrl)
        })
        bgBlobStore
          .clear()
          .catch((err) => logger.error('Failed to clear bg blobs', err))
        set({ images: [] })
      },

      rehydrateBlobs: async () => {
        const { images } = get()
        const restored = await Promise.all(
          images.map(async (image) => {
            if (image.status !== 'complete') return image
            try {
              const buffer = await bgBlobStore.get(image.id)
              if (!buffer) {
                return {
                  ...image,
                  status: 'error' as const,
                  error: 'Data lost',
                }
              }
              const blob = new Blob([buffer], { type: 'image/png' })
              const processedUrl = URL.createObjectURL(blob)
              return { ...image, processedBlob: blob, processedUrl }
            } catch (err) {
              logger.error('Failed to rehydrate bg blob', err)
              return {
                ...image,
                status: 'error' as const,
                error: 'Data lost',
              }
            }
          }),
        )
        set((state) => {
          const map = new Map(restored.map((i) => [i.id, i]))
          return {
            images: state.images.map((i) => map.get(i.id) ?? i),
            isHydrated: true,
          }
        })
      },
    }),
    {
      name: 'clearify-bg-images',
      partialize: (state) => ({
        images: state.images
          .filter((img) => img.status === 'complete')
          .map(
            ({
              file: _file,
              preview: _preview,
              processedBlob: _processedBlob,
              processedUrl: _processedUrl,
              error: _error,
              ...rest
            }) => rest,
          ),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate bg store:', error)
          useBgStore.setState({ isHydrated: true })
          return
        }
        state?.rehydrateBlobs().catch((err) => {
          logger.error('Bg blob rehydration failed:', err)
          useBgStore.setState({ isHydrated: true })
        })
      },
    },
  ),
)

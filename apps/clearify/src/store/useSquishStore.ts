import { logger } from '@cdlab996/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { squishBlobStore } from '@/lib/storage'
import type { ImageFile } from '@/types'

interface SquishStore {
  images: ImageFile[]
  isHydrated: boolean
  addImages: (images: ImageFile[]) => void
  updateImage: (id: string, updates: Partial<ImageFile>) => Promise<void>
  removeImage: (id: string) => void
  clearImages: () => void
  rehydrateBlobs: () => Promise<void>
}

export const useSquishStore = create<SquishStore>()(
  persist(
    (set, get) => ({
      images: [],
      isHydrated: false,

      addImages: (images) =>
        set((state) => ({ images: [...state.images, ...images] })),

      updateImage: async (id, updates) => {
        if (updates.blob) {
          try {
            const buffer = await updates.blob.arrayBuffer()
            await squishBlobStore.set(id, buffer)
          } catch (err) {
            logger.error('Failed to persist squish blob', err)
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
        squishBlobStore
          .remove(id)
          .catch((err) => logger.error('Failed to remove squish blob', err))
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }))
      },

      clearImages: () => {
        get().images.forEach((image) => {
          if (image.preview) URL.revokeObjectURL(image.preview)
        })
        squishBlobStore
          .clear()
          .catch((err) => logger.error('Failed to clear squish blobs', err))
        set({ images: [] })
      },

      rehydrateBlobs: async () => {
        const { images } = get()
        const restored = await Promise.all(
          images.map(async (image) => {
            if (image.status !== 'complete') return image
            try {
              const buffer = await squishBlobStore.get(image.id)
              if (!buffer) {
                return {
                  ...image,
                  status: 'error' as const,
                  error: 'Data lost',
                }
              }
              const mime = image.outputType
                ? `image/${image.outputType}`
                : image.fileType || 'image/png'
              const blob = new Blob([buffer], { type: mime })
              const preview = URL.createObjectURL(blob)
              return { ...image, blob, preview }
            } catch (err) {
              logger.error('Failed to rehydrate squish blob', err)
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
      name: 'clearify-squish-images',
      partialize: (state) => ({
        images: state.images
          .filter((img) => img.status === 'complete')
          .map(
            ({
              file: _file,
              preview: _preview,
              blob: _blob,
              error: _error,
              ...rest
            }) => rest,
          ),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate squish store:', error)
          useSquishStore.setState({ isHydrated: true })
          return
        }
        state?.rehydrateBlobs().catch((err) => {
          logger.error('Squish blob rehydration failed:', err)
          useSquishStore.setState({ isHydrated: true })
        })
      },
    },
  ),
)

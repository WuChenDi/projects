import { logger } from '@cdlab/utils'
import { createIndexedDBStorage } from '@cdlab/zustand-idb'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BgImageFile } from '@/types'

interface BgStore {
  images: BgImageFile[]
  addImages: (images: BgImageFile[]) => void
  updateImage: (id: string, updates: Partial<BgImageFile>) => void
  removeImage: (id: string) => void
  clearImages: () => void
}

export const useBgStore = create<BgStore>()(
  persist(
    (set, get) => ({
      images: [],

      addImages: (images) =>
        set((state) => ({ images: [...state.images, ...images] })),

      updateImage: (id, updates) =>
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, ...updates } : img,
          ),
        })),

      removeImage: (id) => {
        const image = get().images.find((img) => img.id === id)
        if (image?.preview) URL.revokeObjectURL(image.preview)
        if (image?.processedUrl) URL.revokeObjectURL(image.processedUrl)
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }))
      },

      clearImages: () => {
        get().images.forEach((image) => {
          if (image.preview) URL.revokeObjectURL(image.preview)
          if (image.processedUrl) URL.revokeObjectURL(image.processedUrl)
        })
        set({ images: [] })
      },
    }),
    {
      name: 'clearify-bg-images',
      // IndexedDB holds the processed Blob itself, so no metadata/blob split.
      storage: createIndexedDBStorage('clearify', 'stores'),
      // IndexedDB is browser-only: hydrate on the client instead of during SSR.
      skipHydration: true,
      partialize: (state) => ({
        images: state.images
          .filter((img) => img.status === 'complete')
          .map(
            ({
              file: _file,
              preview: _preview,
              processedUrl: _processedUrl,
              error: _error,
              ...rest
            }) => rest,
          ),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate bg store:', error)
          return
        }
        if (!state) return
        // The object URL is session-only — rebuild it from the persisted blob.
        useBgStore.setState({
          images: state.images.map((img) =>
            img.processedBlob
              ? { ...img, processedUrl: URL.createObjectURL(img.processedBlob) }
              : img,
          ),
        })
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  void useBgStore.persist.rehydrate()
}

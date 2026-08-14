import { logger } from '@cdlab/utils'
import { createIndexedDBStorage } from '@cdlab/zustand-idb'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImageFile } from '@/types'

interface SquishStore {
  images: ImageFile[]
  addImages: (images: ImageFile[]) => void
  updateImage: (id: string, updates: Partial<ImageFile>) => void
  removeImage: (id: string) => void
  clearImages: () => void
}

export const useSquishStore = create<SquishStore>()(
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
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }))
      },

      clearImages: () => {
        get().images.forEach((image) => {
          if (image.preview) URL.revokeObjectURL(image.preview)
        })
        set({ images: [] })
      },
    }),
    {
      name: 'clearify-squish-images',
      // IndexedDB holds the compressed Blob itself, so no metadata/blob split.
      storage: createIndexedDBStorage('clearify', 'stores'),
      // IndexedDB is browser-only: hydrate on the client instead of during SSR.
      skipHydration: true,
      partialize: (state) => ({
        images: state.images
          .filter((img) => img.status === 'complete')
          .map(
            ({ file: _file, preview: _preview, error: _error, ...rest }) =>
              rest,
          ),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate squish store:', error)
          return
        }
        if (!state) return
        // The object URL is session-only — rebuild it from the persisted blob.
        useSquishStore.setState({
          images: state.images.map((img) =>
            img.blob ? { ...img, preview: URL.createObjectURL(img.blob) } : img,
          ),
        })
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  void useSquishStore.persist.rehydrate()
}

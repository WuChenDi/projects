import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clearTextContents,
  getTextContent,
  removeTextContents,
  storeTextContent,
} from '@/lib/storage'

export interface RetrievedFile {
  fileId: string
  filename: string
  size: number
  mimeType: string
  isText: boolean
  fileExtension: string | null
  content?: string
}

export interface RetrieveResult {
  id: string
  retrievalCode: string
  encryptionKey: string
  files: RetrievedFile[]
  chestToken: string
  expiryDate: string
  timestamp: number
}

interface RetrieveStore {
  results: RetrieveResult[]
  isHydrated: boolean
  addResult: (result: RetrieveResult) => void
  removeResult: (id: string) => void
  clearResults: () => void
  hasCode: (code: string) => boolean
  rehydrateTextContents: () => Promise<void>
}

function textContentKey(resultId: string, fileId: string) {
  return `${resultId}:${fileId}`
}

export const useRetrieveStore = create<RetrieveStore>()(
  persist(
    (set, get) => ({
      results: [],
      isHydrated: false,

      addResult: (result) => {
        for (const file of result.files) {
          if (file.isText && file.content) {
            storeTextContent(
              textContentKey(result.id, file.fileId),
              file.content,
            ).catch(console.error)
          }
        }
        set((state) => ({
          results: [result, ...state.results],
        }))
      },

      removeResult: (id) => {
        const result = get().results.find((r) => r.id === id)
        if (result) {
          const keys = result.files
            .filter((f) => f.isText)
            .map((f) => textContentKey(id, f.fileId))
          removeTextContents(keys).catch(console.error)
        }
        set((state) => ({
          results: state.results.filter((r) => r.id !== id),
        }))
      },

      clearResults: () => {
        clearTextContents().catch(console.error)
        set({ results: [] })
      },

      hasCode: (code) => get().results.some((r) => r.retrievalCode === code),

      rehydrateTextContents: async () => {
        const results = get().results
        const contentMap = new Map<string, string>()

        await Promise.all(
          results.flatMap((result) =>
            result.files
              .filter((f) => f.isText && !f.content)
              .map(async (file) => {
                const key = textContentKey(result.id, file.fileId)
                const content = await getTextContent(key)
                if (content) {
                  contentMap.set(key, content)
                }
              }),
          ),
        )

        set((state) => ({
          results: state.results.map((result) => ({
            ...result,
            files: result.files.map((file) => {
              if (!file.isText || file.content) return file
              const content = contentMap.get(
                textContentKey(result.id, file.fileId),
              )
              return content ? { ...file, content } : file
            }),
          })),
          isHydrated: true,
        }))
      },
    }),
    {
      name: 'dropply-retrieve-results',
      partialize: (state) => ({
        ...state,
        results: state.results.map(({ encryptionKey, ...r }) => ({
          ...r,
          encryptionKey: '',
          files: r.files.map(({ content, ...file }) => file),
        })),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate retrieve store:', error)
          useRetrieveStore.setState({ isHydrated: true })
          return
        }
        state?.rehydrateTextContents().catch((err) => {
          console.error('Failed to rehydrate text contents:', err)
          useRetrieveStore.setState({ isHydrated: true })
        })
      },
    },
  ),
)

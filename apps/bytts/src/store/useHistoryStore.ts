import { logger } from '@cdlab996/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearBlobs, getBlob, removeBlob, storeBlob } from '@/lib/storage'

export interface HistoryItem {
  id: string
  name?: string
  timestamp: string
  speaker: string
  text: string
  audioBlob?: Blob
  requestInfo: string
  status: 'pending' | 'completed' | 'failed'
  error?: string
}

interface HistoryStore {
  history: HistoryItem[]
  isHydrated: boolean
  addHistory: (item: HistoryItem) => void
  updateHistory: (id: string, updates: Partial<HistoryItem>) => void
  removeHistory: (id: string) => void
  clearHistory: () => void
  rehydrateBlobs: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      isHydrated: false,

      addHistory: (item) =>
        set((state) => ({ history: [item, ...state.history] })),

      updateHistory: (id, updates) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        }))
        if (updates.audioBlob) {
          updates.audioBlob.arrayBuffer().then((buf) => {
            storeBlob(id, buf).catch(console.error)
          })
        }
      },

      removeHistory: (id) => {
        removeBlob(id).catch(console.error)
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }))
      },

      clearHistory: () => {
        clearBlobs().catch(console.error)
        set({ history: [] })
      },

      rehydrateBlobs: async () => {
        const { history } = get()
        const restored = new Map<string, Partial<HistoryItem>>()

        await Promise.all(
          history.map(async (item) => {
            if (item.status !== 'completed') return
            try {
              const buf = await getBlob(item.id)
              if (!buf) {
                restored.set(item.id, {
                  status: 'failed',
                  error: 'Audio data lost',
                })
                return
              }
              restored.set(item.id, {
                audioBlob: new Blob([buf], { type: 'audio/mpeg' }),
              })
            } catch {
              restored.set(item.id, {
                status: 'failed',
                error: 'Audio data lost',
              })
            }
          }),
        )

        set((state) => ({
          history: state.history.map((item) => ({
            ...item,
            ...(restored.get(item.id) ?? {}),
          })),
          isHydrated: true,
        }))
      },
    }),
    {
      name: 'bytts-results',
      partialize: (state) => ({
        history: state.history
          .filter((item) => item.status !== 'pending')
          .map(({ audioBlob, ...rest }) => rest),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate store:', error)
          useHistoryStore.setState({ isHydrated: true })
          return
        }
        state?.rehydrateBlobs().catch((err) => {
          logger.error('Blob rehydration failed:', err)
          useHistoryStore.setState({ isHydrated: true })
        })
      },
    },
  ),
)

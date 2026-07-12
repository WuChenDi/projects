import { StatusEnum } from '@cdlab/ui/IK/IKAssetRenderer'
import { logger } from '@cdlab/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbStore } from '@/lib/storage'

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
  isHydrated: boolean
  addHistory: (item: HistoryItem) => void
  updateHistory: (id: string, updates: Partial<HistoryItem>) => Promise<void>
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
          return updates.audioBlob
            .arrayBuffer()
            .then((buf) => dbStore.set(id, buf))
            .catch(console.error)
        }
        return Promise.resolve()
      },

      removeHistory: (id) => {
        dbStore.remove(id).catch(console.error)
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }))
      },

      clearHistory: () => {
        dbStore.clear().catch(console.error)
        set({ history: [] })
      },

      rehydrateBlobs: async () => {
        const { history } = get()
        const restored = new Map<string, Partial<HistoryItem>>()

        await Promise.all(
          history.map(async (item) => {
            if (item.status !== StatusEnum.COMPLETED) return
            try {
              const buf = await dbStore.get(item.id)
              if (!buf) {
                restored.set(item.id, {
                  status: StatusEnum.FAILED,
                  error: 'Audio data lost',
                })
                return
              }
              restored.set(item.id, {
                audioBlob: new Blob([buf], { type: 'audio/mpeg' }),
              })
            } catch {
              restored.set(item.id, {
                status: StatusEnum.FAILED,
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
          .filter((item) => item.status !== StatusEnum.PROCESSING)
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

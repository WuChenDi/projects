import { StatusEnum } from '@cdlab/ui/IK'
import { logger } from '@cdlab/utils'
import { createIndexedDBStorage } from '@cdlab/zustand-idb'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProcessResult } from '@/types/crypto'

interface ProcessStore {
  processResults: ProcessResult[]
  addResult: (result: ProcessResult) => void
  updateResult: (id: string, updates: Partial<ProcessResult>) => void
  removeResult: (id: string) => void
  removeResults: (ids: string[]) => void
  clearResults: () => void
}

export const useProcessStore = create<ProcessStore>()(
  persist(
    (set) => ({
      processResults: [],

      addResult: (result) =>
        set((state) => ({
          processResults: [result, ...state.processResults],
        })),

      updateResult: (id, updates) =>
        set((state) => ({
          processResults: state.processResults.map((result) =>
            result.id === id ? { ...result, ...updates } : result,
          ),
        })),

      removeResult: (id) =>
        set((state) => {
          const result = state.processResults.find((r) => r.id === id)
          if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl)
          }
          return {
            processResults: state.processResults.filter((r) => r.id !== id),
          }
        }),

      removeResults: (ids) =>
        set((state) => {
          const idsSet = new Set(ids)
          state.processResults.forEach((result) => {
            if (idsSet.has(result.id) && result.downloadUrl) {
              URL.revokeObjectURL(result.downloadUrl)
            }
          })
          return {
            processResults: state.processResults.filter(
              (r) => !idsSet.has(r.id),
            ),
          }
        }),

      clearResults: () =>
        set((state) => {
          state.processResults.forEach((result) => {
            if (result.downloadUrl) {
              URL.revokeObjectURL(result.downloadUrl)
            }
          })
          return { processResults: [] }
        }),
    }),
    {
      name: 'dropply-process-results',
      // IndexedDB holds the payload bytes themselves, so no metadata/blob split.
      storage: createIndexedDBStorage('dropply', 'stores'),
      // IndexedDB is browser-only: hydrate on the client instead of during SSR.
      skipHydration: true,
      partialize: (state) => ({
        processResults: state.processResults
          .filter((r) => r.status === StatusEnum.COMPLETED)
          .map(({ downloadUrl, ...rest }) => rest),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate store:', error)
          return
        }
        if (!state) return
        // The object URL is session-only — rebuild it from the persisted bytes.
        useProcessStore.setState({
          processResults: state.processResults.map((result) =>
            result.fileInfo
              ? {
                  ...result,
                  downloadUrl: URL.createObjectURL(
                    new Blob([result.data], { type: result.fileInfo.type }),
                  ),
                }
              : result,
          ),
        })
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  void useProcessStore.persist.rehydrate()
}

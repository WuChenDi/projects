import { StatusEnum } from '@cdlab/ui/IK'
import { logger } from '@cdlab/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbStore } from '@/lib/storage'
import type { ProcessResult } from '@/types'

interface ProcessStore {
  processResults: ProcessResult[]
  isHydrated: boolean
  addResult: (result: ProcessResult) => void
  updateResult: (id: string, updates: Partial<ProcessResult>) => void
  removeResult: (id: string) => void
  removeResults: (ids: string[]) => void
  clearResults: () => void
  rehydrateBlobs: () => Promise<void>
}

export const useProcessStore = create<ProcessStore>()(
  persist(
    (set, get) => ({
      processResults: [],
      isHydrated: false,

      addResult: (result) => {
        set((state) => ({
          processResults: [result, ...state.processResults],
        }))
        if (result.data.byteLength > 0) {
          dbStore.set(result.id, result.data).catch(console.error)
        }
      },

      updateResult: (id, updates) => {
        set((state) => ({
          processResults: state.processResults.map((result) =>
            result.id === id ? { ...result, ...updates } : result,
          ),
        }))
        if (updates.data && updates.data.byteLength > 0) {
          dbStore.set(id, updates.data).catch(console.error)
        }
      },

      removeResult: (id) =>
        set((state) => {
          const result = state.processResults.find((r) => r.id === id)
          if (result?.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl)
          }
          dbStore.remove(id).catch(console.error)
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
          dbStore.removeBatch(ids).catch(console.error)
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
          dbStore.clear().catch(console.error)
          return { processResults: [] }
        }),

      rehydrateBlobs: async () => {
        const { processResults } = get()
        const restoredMap = new Map<string, ProcessResult>()

        await Promise.all(
          processResults.map(async (result) => {
            if (result.status !== StatusEnum.COMPLETED) {
              restoredMap.set(result.id, result)
              return
            }
            try {
              const data = await dbStore.get(result.id)
              if (!data) {
                restoredMap.set(result.id, {
                  ...result,
                  status: StatusEnum.FAILED,
                  error: 'Data lost',
                })
                return
              }

              let downloadUrl: string | undefined
              if (result.fileInfo) {
                const blob = new Blob([data], { type: result.fileInfo.type })
                downloadUrl = URL.createObjectURL(blob)
              }

              restoredMap.set(result.id, { ...result, data, downloadUrl })
            } catch {
              restoredMap.set(result.id, {
                ...result,
                status: StatusEnum.FAILED,
                error: 'Data lost',
              })
            }
          }),
        )

        // Merge with current state to avoid overwriting concurrent mutations
        set((state) => ({
          processResults: state.processResults.map(
            (r) => restoredMap.get(r.id) ?? r,
          ),
          isHydrated: true,
        }))
      },
    }),
    {
      name: 'securec-process-results',
      partialize: (state) => ({
        processResults: state.processResults
          .filter((r) => r.status === StatusEnum.COMPLETED)
          .map(({ data, downloadUrl, ...rest }) => ({
            ...rest,
            data: new ArrayBuffer(0),
          })),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Failed to rehydrate store:', error)
          useProcessStore.setState({ isHydrated: true })
          return
        }
        state?.rehydrateBlobs().catch((err) => {
          logger.error('Blob rehydration failed:', err)
          useProcessStore.setState({ isHydrated: true })
        })
      },
    },
  ),
)

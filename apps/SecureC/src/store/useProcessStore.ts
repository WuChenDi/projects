import { create } from 'zustand'
import type { ProcessResult } from '@/types'

interface ProcessStore {
  processResults: ProcessResult[]
  addResult: (result: ProcessResult) => void
  updateResult: (id: string, updates: Partial<ProcessResult>) => void
  removeResult: (id: string) => void
  removeResults: (ids: string[]) => void
  clearResults: () => void
}

export const useProcessStore = create<ProcessStore>()((set, get) => ({
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
        processResults: state.processResults.filter((r) => !idsSet.has(r.id)),
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
}))

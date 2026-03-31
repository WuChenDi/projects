import { create } from 'zustand'
import type { BatchUrlMetadata } from '@/lib'

export type BatchStatus =
  | 'pending'
  | 'parsing'
  | 'parsed'
  | 'downloading'
  | 'done'
  | 'error'

export type BatchFormat = 'ts' | 'mp4' | 'stream-ts' | 'stream-mp4'

export interface BatchItem {
  id: number
  url: string
  status: BatchStatus
  meta: BatchUrlMetadata | null
  selectedVariantUrl: string
  rangeStart: number
  rangeEnd: number
  customName: string
  format: BatchFormat
}

let batchIdCounter = 0

interface BatchState {
  batchText: string
  batchList: BatchItem[]
  isBatchParsing: boolean
  isBatchRunning: boolean

  // Actions
  setBatchText: (text: string) => void
  addItems: (urls: string[]) => BatchItem[]
  updateItem: (id: number, patch: Partial<BatchItem>) => void
  removeItem: (id: number) => void
  clearDone: () => void
  setIsBatchParsing: (v: boolean) => void
  setIsBatchRunning: (v: boolean) => void
}

export const useBatchStore = create<BatchState>()((set, get) => ({
  batchText: '',
  batchList: [],
  isBatchParsing: false,
  isBatchRunning: false,

  setBatchText: (text) => set({ batchText: text }),

  addItems: (urls) => {
    const items: BatchItem[] = urls.map((u) => ({
      id: ++batchIdCounter,
      url: u,
      status: 'pending' as const,
      meta: null,
      selectedVariantUrl: '',
      rangeStart: 1,
      rangeEnd: 0,
      customName: '',
      format: 'mp4' as const,
    }))
    set((state) => ({
      batchList: [...state.batchList, ...items],
      batchText: '',
    }))
    return items
  },

  updateItem: (id, patch) =>
    set((state) => ({
      batchList: state.batchList.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      batchList: state.batchList.filter((b) => b.id !== id),
    })),

  clearDone: () =>
    set((state) => ({
      batchList: state.batchList.filter((b) => b.status !== 'done'),
    })),

  setIsBatchParsing: (v) => set({ isBatchParsing: v }),
  setIsBatchRunning: (v) => set({ isBatchRunning: v }),
}))

// ---- Derived selectors ----
export const selectPendingCount = (s: BatchState) =>
  s.batchList.filter((b) => b.status === 'pending').length

export const selectParsedCount = (s: BatchState) =>
  s.batchList.filter((b) => b.status === 'parsed').length

export const selectDoneCount = (s: BatchState) =>
  s.batchList.filter((b) => b.status === 'done').length

export const selectErrorCount = (s: BatchState) =>
  s.batchList.filter((b) => b.status === 'error').length

export const selectCurrentDownloadingId = (s: BatchState) =>
  s.batchList.find((b) => b.status === 'downloading')?.id ?? null

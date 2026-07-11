import { create } from 'zustand'

// Handoff channel from the history cards (outside the editor) to the lazily
// loaded timeline editor. Items are buffered so a "send to timeline" click
// that lands before the editor chunk finishes loading is not lost.

export interface PendingMaterial {
  /** Stable key reused as the media pool id (e.g. the history item id). */
  mediaId: string
  name: string
  blob: Blob
}

interface MaterialBridgeState {
  pending: PendingMaterial[]
  send: (material: PendingMaterial) => void
  drain: () => PendingMaterial[]
}

export const useMaterialBridge = create<MaterialBridgeState>((set, get) => ({
  pending: [],
  send: (material) =>
    set((state) => ({ pending: [...state.pending, material] })),
  drain: () => {
    const { pending } = get()
    if (pending.length > 0) set({ pending: [] })
    return pending
  },
}))

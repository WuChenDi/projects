import { create } from 'zustand'
import type { ClipboardClip } from '@/editor/core/timeline-commands'

// Editor UI state kept outside EditorCore (which owns timeline data). Holds the
// snapping toggle and the copy/paste clipboard. Mirrors bycut's timeline-store.

interface TimelineUiState {
  snappingEnabled: boolean
  toggleSnapping: () => void
  clipboard: ClipboardClip[]
  setClipboard: (items: ClipboardClip[]) => void
}

export const useTimelineUiStore = create<TimelineUiState>((set) => ({
  snappingEnabled: true,
  toggleSnapping: () =>
    set((state) => ({ snappingEnabled: !state.snappingEnabled })),
  clipboard: [],
  setClipboard: (items) => set({ clipboard: items }),
}))

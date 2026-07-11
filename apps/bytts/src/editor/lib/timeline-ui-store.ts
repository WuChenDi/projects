import { create } from 'zustand'
import type { ClipboardClip } from '@/editor/core/timeline-commands'
import type { AudioSilenceRange } from '@/editor/lib/audio-silence'

// Editor UI state kept outside EditorCore (which owns timeline data). Holds the
// snapping toggle, the copy/paste clipboard, and the transient silence-detection
// preview (detected ranges shown as an overlay on a clip before applying).
// Mirrors bycut's timeline-store.

interface SilencePreview {
  clipId: string
  ranges: AudioSilenceRange[]
}

interface TimelineUiState {
  snappingEnabled: boolean
  toggleSnapping: () => void
  clipboard: ClipboardClip[]
  setClipboard: (items: ClipboardClip[]) => void
  silencePreview: SilencePreview | null
  setSilencePreview: (preview: SilencePreview | null) => void
}

export const useTimelineUiStore = create<TimelineUiState>((set) => ({
  snappingEnabled: true,
  toggleSnapping: () =>
    set((state) => ({ snappingEnabled: !state.snappingEnabled })),
  clipboard: [],
  setClipboard: (items) => set({ clipboard: items }),
  silencePreview: null,
  setSilencePreview: (preview) => set({ silencePreview: preview }),
}))

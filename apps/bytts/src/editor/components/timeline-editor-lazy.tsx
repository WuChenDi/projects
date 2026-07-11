'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy boundary: the editor chunk (Web Audio + IndexedDB + waveform canvas) is
// client-only and loaded on demand, so the generation UX is unaffected if it
// fails to load.
export const TimelineEditorLazy = dynamic(
  () =>
    import('@/editor/components/timeline-editor').then((m) => m.TimelineEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-sm border">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    ),
  },
)

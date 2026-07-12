'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

// Lazy boundary: the editor chunk (Web Audio + IndexedDB + waveform canvas) is
// client-only and loaded on demand, so the generation UX is unaffected if it
// fails to load.
const LazyEditor = dynamic(
  () =>
    import('@/editor/components/timeline-editor').then((m) => m.TimelineEditor),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card flex h-full items-center justify-center rounded-xl">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    ),
  },
)

// Dispose the editor core on unmount via a dynamic import so the always-loaded
// wrapper chunk never statically pulls in the editor core (which would defeat
// the lazy boundary above).
export function TimelineEditorLazy() {
  useEffect(
    () => () => {
      void import('@/editor/core').then((m) => m.EditorCore.reset())
    },
    [],
  )
  return <LazyEditor />
}

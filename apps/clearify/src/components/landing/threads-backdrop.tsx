'use client'

import { lazy, Suspense } from 'react'

// Threads is a WebGL (ogl) backdrop — browser-only and heavy. Lazy-load it so it
// stays out of the initial landing chunk; a null fallback keeps it decorative.
const Threads = lazy(() => import('@cdlab/ui/reactbits/Threads'))

interface ThreadsBackdropProps {
  color?: [number, number, number]
  amplitude?: number
  distance?: number
  enableMouseInteraction?: boolean
}

export function ThreadsBackdrop(props: ThreadsBackdropProps) {
  return (
    <Suspense fallback={null}>
      <Threads {...props} />
    </Suspense>
  )
}

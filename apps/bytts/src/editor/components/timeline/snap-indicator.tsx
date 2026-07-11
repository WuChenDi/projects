'use client'

import { TIMELINE_CONSTANTS } from '@/editor/constants'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'

// Thin vertical guide shown at the active snap point while dragging or trimming.
// Rendered inside the horizontally-scrolled track content, so its left offset is
// simply the snap time in pixels.

interface SnapIndicatorProps {
  snapPoint: SnapPoint | null
  zoomLevel: number
  height: number
}

export function SnapIndicator({
  snapPoint,
  zoomLevel,
  height,
}: SnapIndicatorProps) {
  if (!snapPoint) return null

  const left = snapPoint.time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

  return (
    <div
      className="bg-primary/70 pointer-events-none absolute top-0 z-40 w-0.5"
      style={{ left: `${left}px`, height: `${height}px` }}
    />
  )
}

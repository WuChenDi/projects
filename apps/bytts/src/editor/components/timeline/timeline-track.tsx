'use client'

import type { AudioTrack } from '@/editor/types'
import { AudioClip } from './audio-clip'

// One track row. FEAT-026 only renders clips; drag/drop + selection box are
// FEAT-027.

interface TimelineTrackContentProps {
  track: AudioTrack
  zoomLevel: number
}

export function TimelineTrackContent({
  track,
  zoomLevel,
}: TimelineTrackContentProps) {
  return (
    <div className="relative h-full min-w-full">
      {track.clips.length === 0 ? (
        <div className="border-muted/30 text-muted-foreground flex size-full items-center justify-center rounded-sm border-2 border-dashed text-xs" />
      ) : (
        track.clips.map((clip) => (
          <AudioClip
            key={clip.id}
            clip={clip}
            track={track}
            zoomLevel={zoomLevel}
          />
        ))
      )}
    </div>
  )
}

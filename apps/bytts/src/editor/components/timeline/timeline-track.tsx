'use client'

import type { ClipDragState } from '@/editor/hooks/timeline/use-clip-interaction'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import type { AudioClip as AudioClipType, AudioTrack } from '@/editor/types'
import { AudioClip } from './audio-clip'

// One track row. Renders each clip and forwards the drag/select/trim handlers
// down from the timeline editor.

interface TimelineTrackContentProps {
  track: AudioTrack
  zoomLevel: number
  dragState: ClipDragState
  selectedCount: number
  onClipMouseDown: (params: {
    event: React.MouseEvent
    clip: AudioClipType
    track: AudioTrack
  }) => void
  onClipClick: (params: {
    event: React.MouseEvent
    clip: AudioClipType
    track: AudioTrack
  }) => void
  onSnapPointChange: (snapPoint: SnapPoint | null) => void
}

export function TimelineTrackContent({
  track,
  zoomLevel,
  dragState,
  selectedCount,
  onClipMouseDown,
  onClipClick,
  onSnapPointChange,
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
            dragState={dragState}
            selectedCount={selectedCount}
            onClipMouseDown={onClipMouseDown}
            onClipClick={onClipClick}
            onSnapPointChange={onSnapPointChange}
          />
        ))
      )}
    </div>
  )
}

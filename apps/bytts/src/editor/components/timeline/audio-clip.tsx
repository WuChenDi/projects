'use client'

import { AudioWaveform } from '@cdlab/ui/components/audio-waveform'
import { cn } from '@cdlab/ui/lib/utils'
import { useMemo } from 'react'
import { TIMELINE_CONSTANTS, TRACK_GAP, TRACK_HEIGHT } from '@/editor/constants'
import type { ClipDragState } from '@/editor/hooks/timeline/use-clip-interaction'
import { useClipResize } from '@/editor/hooks/timeline/use-clip-resize'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useEditor } from '@/editor/hooks/use-editor'
import type { AudioClip as AudioClipType, AudioTrack } from '@/editor/types'

// Single audio clip: name header + waveform, draggable (move/cross-track) with
// left/right trim handles when selected. Live position follows the drag state so
// the clip visually tracks the pointer before the move is committed.

const CLIP_PADDING = 4
const HEADER_HEIGHT = 16
const ROW_STRIDE = TRACK_HEIGHT + TRACK_GAP

interface AudioClipProps {
  clip: AudioClipType
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

export function AudioClip({
  clip,
  track,
  zoomLevel,
  dragState,
  selectedCount,
  onClipMouseDown,
  onClipClick,
  onSnapPointChange,
}: AudioClipProps) {
  const editor = useEditor()
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

  const isSelected = editor.selection.isSelected({
    trackId: track.id,
    clipId: clip.id,
  })

  const { isResizing, handleResizeStart, currentStartTime, currentDuration } =
    useClipResize({ clip, track, zoomLevel, onSnapPointChange })

  const isBeingDragged = dragState.isDragging && dragState.clipId === clip.id
  const isBatchMember = isSelected && selectedCount > 1
  const isBatchDragged =
    !isBeingDragged && dragState.isDragging && isBatchMember
  const timeDelta = dragState.isDragging
    ? dragState.currentTime - dragState.startClipTime
    : 0

  const displayStartTime = isResizing
    ? currentStartTime
    : isBeingDragged
      ? dragState.currentTime
      : isBatchDragged
        ? Math.max(0, clip.startTime + timeDelta)
        : clip.startTime
  const displayDuration = isResizing ? currentDuration : clip.duration

  const left = displayStartTime * pixelsPerSecond
  const width = Math.max(2, displayDuration * pixelsPerSecond)
  const waveformWidth = Math.max(0, width - CLIP_PADDING * 2)
  const waveformHeight = TRACK_HEIGHT - HEADER_HEIGHT - CLIP_PADDING * 2

  // Cross-track drag: follow the pointer's target row (single-clip drag only).
  const verticalOffset =
    isBeingDragged && !isBatchMember
      ? (dragState.targetTrackIndex - dragState.sourceTrackIndex) * ROW_STRIDE
      : 0

  const asset = editor.media.getAsset({ id: clip.mediaId })
  const blob = asset?.file
  const waveformBlob = useMemo(() => blob, [blob])

  return (
    <div
      className={cn(
        'absolute top-0 cursor-grab overflow-hidden rounded-md border bg-[#915DBE] text-left text-white select-none',
        isSelected ? 'ring-primary ring-2' : 'border-white/20',
        (track.muted || clip.muted) && 'opacity-50',
        isBeingDragged && 'cursor-grabbing',
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${TRACK_HEIGHT}px`,
        padding: `${CLIP_PADDING}px`,
        transform: verticalOffset
          ? `translate3d(0, ${verticalOffset}px, 0)`
          : undefined,
        zIndex: isBeingDragged ? 30 : 10,
      }}
      onMouseDown={(event) => onClipMouseDown({ event, clip, track })}
      onClick={(event) => onClipClick({ event, clip, track })}
    >
      <div
        className="truncate text-[10px] leading-4 font-medium"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        {clip.name}
      </div>
      {waveformBlob && waveformWidth > 0 ? (
        <AudioWaveform
          blob={waveformBlob}
          width={waveformWidth}
          height={waveformHeight}
          barColor="rgba(255, 255, 255, 0.85)"
        />
      ) : null}

      {isSelected && !dragState.isDragging ? (
        <>
          <ResizeHandle side="left" onResizeStart={handleResizeStart} />
          <ResizeHandle side="right" onResizeStart={handleResizeStart} />
        </>
      ) : null}
    </div>
  )
}

function ResizeHandle({
  side,
  onResizeStart,
}: {
  side: 'left' | 'right'
  onResizeStart: (params: {
    event: React.MouseEvent
    side: 'left' | 'right'
  }) => void
}) {
  const isLeft = side === 'left'
  return (
    <button
      type="button"
      aria-label={isLeft ? '左侧裁剪' : '右侧裁剪'}
      className={cn(
        'bg-primary absolute top-0 bottom-0 z-50 flex w-2 items-center justify-center',
        isLeft ? 'left-0 cursor-w-resize' : 'right-0 cursor-e-resize',
      )}
      onMouseDown={(event) => onResizeStart({ event, side })}
    >
      <div className="bg-foreground h-6 w-0.5 rounded-full" />
    </button>
  )
}

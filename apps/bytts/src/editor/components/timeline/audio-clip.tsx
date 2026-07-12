'use client'

import { AudioWaveform } from '@cdlab/ui/components/audio-waveform'
import { cn } from '@cdlab/ui/lib/utils'
import { useEffect, useState } from 'react'
import { TIMELINE_CONSTANTS, TRACK_GAP, TRACK_HEIGHT } from '@/editor/constants'
import { useClipFade } from '@/editor/hooks/timeline/use-clip-fade'
import { useClipGain } from '@/editor/hooks/timeline/use-clip-gain'
import type { ClipDragState } from '@/editor/hooks/timeline/use-clip-interaction'
import { useClipResize } from '@/editor/hooks/timeline/use-clip-resize'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useEditor } from '@/editor/hooks/use-editor'
import { gainDbToFraction } from '@/editor/lib/audio-gain'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import type { AudioClip as AudioClipType, AudioTrack } from '@/editor/types'
import { ClipInspector } from './clip-inspector'

// Single audio clip: name header + waveform, draggable (move/cross-track) with
// left/right trim handles when selected. When selected it also exposes the audio
// controls added in FEAT-028 — corner fade handles, a draggable volume line and
// an inspector popover — plus fade shading and the silence-detection overlay.

const CLIP_PADDING = 4
const HEADER_HEIGHT = 16
const ROW_STRIDE = TRACK_HEIGHT + TRACK_GAP
const BODY_TOP = CLIP_PADDING + HEADER_HEIGHT

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

  const bodyHeight = TRACK_HEIGHT - HEADER_HEIGHT - CLIP_PADDING * 2
  const { fadeIn, fadeOut, handleFadeStart } = useClipFade({ clip, zoomLevel })
  const { gainDb, handleGainStart } = useClipGain({ clip, bodyHeight })

  const silencePreview = useTimelineUiStore((state) => state.silencePreview)
  const previewRanges =
    silencePreview?.clipId === clip.id ? silencePreview.ranges : null

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
  const waveformHeight = bodyHeight

  const fadeInPx = Math.min(width, fadeIn * pixelsPerSecond)
  const fadeOutPx = Math.min(width, fadeOut * pixelsPerSecond)
  const gainFraction = gainDbToFraction(gainDb)
  const showControls = isSelected && !dragState.isDragging

  // Cross-track drag: follow the pointer's target row (single-clip drag only).
  const verticalOffset =
    isBeingDragged && !isBatchMember
      ? (dragState.targetTrackIndex - dragState.sourceTrackIndex) * ROW_STRIDE
      : 0

  const [waveformBuffer, setWaveformBuffer] = useState<AudioBuffer | null>(null)
  useEffect(() => {
    let active = true
    // Clear the previous buffer so a mediaId change never briefly renders the
    // stale waveform while the new decode is in flight.
    setWaveformBuffer(null)
    void editor.audio
      .getWaveformBuffer({ mediaId: clip.mediaId })
      .then((buffer) => {
        if (active) setWaveformBuffer(buffer)
      })
    return () => {
      active = false
    }
  }, [editor, clip.mediaId])

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
      {waveformBuffer && waveformWidth > 0 ? (
        <AudioWaveform
          audioBuffer={waveformBuffer}
          width={waveformWidth}
          height={waveformHeight}
          barColor="rgba(255, 255, 255, 0.85)"
        />
      ) : null}

      {/* Fade shading: the attenuated corner triangles over the clip body. */}
      {fadeInPx > 0 || fadeOutPx > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={TRACK_HEIGHT}
          aria-hidden
        >
          {fadeInPx > 0 ? (
            <polygon
              points={`0,0 ${fadeInPx},0 0,${TRACK_HEIGHT}`}
              fill="rgba(0,0,0,0.35)"
            />
          ) : null}
          {fadeOutPx > 0 ? (
            <polygon
              points={`${width - fadeOutPx},0 ${width},0 ${width},${TRACK_HEIGHT}`}
              fill="rgba(0,0,0,0.35)"
            />
          ) : null}
        </svg>
      ) : null}

      {/* Silence-detection preview overlay (clip-relative seconds). */}
      {previewRanges
        ? previewRanges.map((range, index) => (
            <div
              key={`${range.start}-${index}`}
              className="pointer-events-none absolute top-0 bottom-0 bg-red-500/40"
              style={{
                left: `${range.start * pixelsPerSecond}px`,
                width: `${Math.max(1, (range.end - range.start) * pixelsPerSecond)}px`,
              }}
            />
          ))
        : null}

      {showControls ? (
        <>
          <ClipInspector clip={clip} track={track} />

          {/* Draggable volume line: vertical position maps to gain in dB. */}
          <button
            type="button"
            aria-label="音量线"
            className="absolute right-0 left-0 z-40 h-2 cursor-ns-resize"
            style={{
              top: `${BODY_TOP + gainFraction * waveformHeight - 4}px`,
            }}
            onMouseDown={(event) => handleGainStart({ event })}
          >
            <span className="pointer-events-none absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-amber-300" />
          </button>

          {/* Corner fade handles. */}
          <button
            type="button"
            aria-label="淡入"
            title="淡入"
            className="absolute top-0 z-50 size-2.5 -translate-x-1/2 cursor-ew-resize rounded-full border border-white bg-amber-300"
            style={{ left: `${fadeInPx}px` }}
            onMouseDown={(event) => handleFadeStart({ event, side: 'in' })}
          />
          <button
            type="button"
            aria-label="淡出"
            title="淡出"
            className="absolute top-0 z-50 size-2.5 translate-x-1/2 cursor-ew-resize rounded-full border border-white bg-amber-300"
            style={{ left: `${width - fadeOutPx}px` }}
            onMouseDown={(event) => handleFadeStart({ event, side: 'out' })}
          />

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

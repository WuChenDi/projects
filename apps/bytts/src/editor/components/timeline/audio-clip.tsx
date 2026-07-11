'use client'

import { AudioWaveform } from '@cdlab/ui/components/audio-waveform'
import { cn } from '@cdlab/ui/lib/utils'
import { useMemo } from 'react'
import { TIMELINE_CONSTANTS, TRACK_HEIGHT } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import type { AudioClip as AudioClipType, AudioTrack } from '@/editor/types'

// Single audio clip on a track: name header + canvas waveform, sized/placed by
// startTime & duration. Drag/trim/split land in FEAT-027 — clicking only
// selects for now.

const CLIP_PADDING = 4
const HEADER_HEIGHT = 16

interface AudioClipProps {
  clip: AudioClipType
  track: AudioTrack
  zoomLevel: number
}

export function AudioClip({ clip, track, zoomLevel }: AudioClipProps) {
  const editor = useEditor()
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

  const left = clip.startTime * pixelsPerSecond
  const width = Math.max(2, clip.duration * pixelsPerSecond)
  const waveformWidth = Math.max(0, width - CLIP_PADDING * 2)
  const waveformHeight = TRACK_HEIGHT - HEADER_HEIGHT - CLIP_PADDING * 2

  const isSelected = editor.selection.isSelected({
    trackId: track.id,
    clipId: clip.id,
  })

  const asset = editor.media.getAsset({ id: clip.mediaId })
  const blob = asset?.file

  // Reuse the same blob reference across renders so the waveform decodes once.
  const waveformBlob = useMemo(() => blob, [blob])

  return (
    <button
      type="button"
      className={cn(
        'absolute top-0 overflow-hidden rounded-md border bg-[#915DBE] text-left text-white',
        isSelected ? 'ring-2 ring-primary' : 'border-white/20',
        (track.muted || clip.muted) && 'opacity-50',
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${TRACK_HEIGHT}px`,
        padding: `${CLIP_PADDING}px`,
      }}
      onClick={(event) => {
        event.stopPropagation()
        editor.selection.setSelected({
          clips: [{ trackId: track.id, clipId: clip.id }],
        })
      }}
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
    </button>
  )
}

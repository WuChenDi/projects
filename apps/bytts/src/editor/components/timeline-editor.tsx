'use client'

import { Button } from '@cdlab/ui/components/button'
import { cn } from '@cdlab/ui/lib/utils'
import { Music, Plus, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { TIMELINE_CONSTANTS, TRACK_GAP, TRACK_HEIGHT } from '@/editor/constants'
import { EditorCore } from '@/editor/core'
import { useTimelinePlayhead } from '@/editor/hooks/timeline/use-timeline-playhead'
import { useTimelineSeek } from '@/editor/hooks/timeline/use-timeline-seek'
import { useTimelineZoom } from '@/editor/hooks/timeline/use-timeline-zoom'
import { useEditor } from '@/editor/hooks/use-editor'
import { useMaterialBridge } from '@/editor/lib/material-bridge'
import {
  getTimelinePaddingPx,
  getTimelineZoomMin,
  getZoomToFit,
} from '@/editor/lib/zoom-utils'
import { MediaDropzone } from './media-dropzone'
import { TimelinePlayhead } from './timeline/timeline-playhead'
import { TimelineRuler } from './timeline/timeline-ruler'
import { TimelineToolbar } from './timeline/timeline-toolbar'
import { TimelineTrackContent } from './timeline/timeline-track'

// Audio timeline editor shell: transport/zoom toolbar, media intake, a fixed
// track-label column and a single horizontally-scrolled ruler + tracks pane.
// Rendering + Web Audio preview only — interactions land in FEAT-027..029.

export function TimelineEditor() {
  const editor = useEditor()
  const tracks = editor.timeline.getTracks()
  const duration = editor.timeline.getTotalDuration()

  const timelineRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  // Seed two tracks so material can spread across them (drag-to-track is 027).
  useEffect(() => {
    const core = EditorCore.getInstance()
    if (core.timeline.getTracks().length === 0) {
      core.timeline.addTrack()
      core.timeline.addTrack()
    }
  }, [])

  const ingest = useCallback(
    async ({
      file,
      name,
      mediaId,
    }: {
      file: File
      name: string
      mediaId?: string
    }) => {
      const core = EditorCore.getInstance()
      try {
        const asset = await core.media.addAsset({ file, name, mediaId })
        core.timeline.addClipFromMedia({
          mediaId: asset.id,
          name,
          duration: asset.duration,
        })
      } catch (error) {
        console.error('Failed to add audio to timeline:', error)
        toast.error('音频解码失败，请重试')
      }
    },
    [],
  )

  // Drain "send to timeline" handoffs from the history cards (buffered so a
  // click before this chunk loads is not lost), then keep listening.
  useEffect(() => {
    const process = () => {
      const items = useMaterialBridge.getState().drain()
      for (const item of items) {
        const file = new File([item.blob], `${item.name}.mp3`, {
          type: item.blob.type || 'audio/mpeg',
        })
        void ingest({ file, name: item.name, mediaId: item.mediaId })
      }
    }

    process()
    return useMaterialBridge.subscribe((state) => {
      if (state.pending.length > 0) process()
    })
  }, [ingest])

  const handleLocalFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const name = file.name.replace(/\.[^./]+$/, '')
        void ingest({ file, name })
      }
    },
    [ingest],
  )

  const containerWidth = tracksContainerRef.current?.clientWidth || 1000
  const minZoomLevel = getTimelineZoomMin({ duration, containerWidth })

  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    minZoom: minZoomLevel,
    tracksScrollRef,
    rulerScrollRef: tracksScrollRef,
  })

  const {
    handleTracksMouseDown,
    handleTracksClick,
    handleRulerMouseDown,
    handleRulerClick,
  } = useTimelineSeek({
    playheadRef,
    rulerScrollRef: tracksScrollRef,
    tracksScrollRef,
    zoomLevel,
    duration,
  })

  const { handleRulerMouseDown: handlePlayheadRulerMouseDown } =
    useTimelinePlayhead({
      zoomLevel,
      rulerRef,
      rulerScrollRef: tracksScrollRef,
      tracksScrollRef,
      playheadRef,
    })

  const contentWidth =
    duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  const paddingPx = getTimelinePaddingPx({
    containerWidth,
    zoomLevel,
    minZoom: minZoomLevel,
  })
  const dynamicTimelineWidth = Math.max(
    contentWidth + paddingPx,
    containerWidth,
  )

  const totalTracksHeight =
    tracks.length * TRACK_HEIGHT + Math.max(0, tracks.length - 1) * TRACK_GAP

  return (
    <section
      className="bg-background relative flex h-full flex-col overflow-hidden rounded-sm border"
      aria-label="Audio timeline editor"
    >
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <MediaDropzone onFiles={handleLocalFiles} />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => editor.timeline.addTrack()}
        >
          <Plus className="size-4" />
          添加音轨
        </Button>
      </div>

      <TimelineToolbar
        zoomLevel={zoomLevel}
        minZoom={minZoomLevel}
        zoomToFitLevel={getZoomToFit({ duration, containerWidth })}
        setZoomLevel={setZoomLevel}
      />

      <div className="relative flex flex-1 overflow-hidden" ref={timelineRef}>
        {/* Track labels column (not horizontally scrolled) */}
        <div className="bg-background flex w-28 shrink-0 flex-col border-r">
          <div className="h-4 shrink-0" />
          <div className="flex flex-col gap-1 overflow-hidden pt-px">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between gap-2 px-2"
                style={{ height: `${TRACK_HEIGHT}px` }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Music className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate text-xs">{track.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    editor.timeline.toggleTrackMute({ trackId: track.id })
                  }
                  title={track.muted ? '取消静音' : '静音'}
                >
                  {track.muted ? (
                    <VolumeX className="text-destructive size-4" />
                  ) : (
                    <Volume2 className="text-muted-foreground size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ruler + tracks (single horizontal scroller) */}
        <div
          className="relative flex flex-1 flex-col overflow-hidden"
          ref={tracksContainerRef}
        >
          <TimelinePlayhead
            zoomLevel={zoomLevel}
            rulerRef={rulerRef}
            rulerScrollRef={tracksScrollRef}
            tracksScrollRef={tracksScrollRef}
            containerRef={tracksContainerRef}
            playheadRef={playheadRef}
          />
          <div
            ref={tracksScrollRef}
            className="size-full overflow-x-auto overflow-y-hidden"
            onWheel={handleWheel}
          >
            <div
              className="relative"
              style={{ width: `${dynamicTimelineWidth}px` }}
            >
              <div className="bg-background sticky top-0 z-30">
                <TimelineRuler
                  zoomLevel={zoomLevel}
                  dynamicTimelineWidth={dynamicTimelineWidth}
                  rulerRef={rulerRef}
                  tracksScrollRef={tracksScrollRef}
                  handleWheel={handleWheel}
                  handleRulerClick={handleRulerClick}
                  handleRulerTrackingMouseDown={handleRulerMouseDown}
                  handleRulerMouseDown={handlePlayheadRulerMouseDown}
                />
              </div>
              <div
                className="relative flex flex-col gap-1"
                style={{ height: `${totalTracksHeight}px` }}
                onMouseDown={handleTracksMouseDown}
                onClick={handleTracksClick}
              >
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={cn('relative w-full')}
                    style={{ height: `${TRACK_HEIGHT}px` }}
                  >
                    <TimelineTrackContent track={track} zoomLevel={zoomLevel} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TimelineEditor

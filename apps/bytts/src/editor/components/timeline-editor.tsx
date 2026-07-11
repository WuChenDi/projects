'use client'

import { Button } from '@cdlab/ui/components/button'
import { cn } from '@cdlab/ui/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Headphones,
  Music,
  Plus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TIMELINE_CONSTANTS, TRACK_GAP, TRACK_HEIGHT } from '@/editor/constants'
import { EditorCore } from '@/editor/core'
import { useAutosave } from '@/editor/hooks/timeline/use-autosave'
import { useClipInteraction } from '@/editor/hooks/timeline/use-clip-interaction'
import { useEditorShortcuts } from '@/editor/hooks/timeline/use-editor-shortcuts'
import { useSelectionBox } from '@/editor/hooks/timeline/use-selection-box'
import { useTimelinePlayhead } from '@/editor/hooks/timeline/use-timeline-playhead'
import { useTimelineSeek } from '@/editor/hooks/timeline/use-timeline-seek'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useTimelineZoom } from '@/editor/hooks/timeline/use-timeline-zoom'
import { useEditor } from '@/editor/hooks/use-editor'
import { useMaterialBridge } from '@/editor/lib/material-bridge'
import {
  getTimelinePaddingPx,
  getTimelineZoomMin,
  getZoomToFit,
} from '@/editor/lib/zoom-utils'
import { MediaDropzone } from './media-dropzone'
import { ExportButton } from './timeline/export-dialog'
import { SnapIndicator } from './timeline/snap-indicator'
import { TimelinePlayhead } from './timeline/timeline-playhead'
import { TimelineRuler } from './timeline/timeline-ruler'
import { TimelineToolbar } from './timeline/timeline-toolbar'
import { TimelineTrackContent } from './timeline/timeline-track'

// Audio timeline editor: transport/edit/zoom toolbar, media intake, a fixed
// track-label column and a single horizontally-scrolled ruler + tracks pane.
// FEAT-027 adds clip drag/trim/split, multi/box selection, snapping, track
// add/remove/reorder, undo/redo and IndexedDB autosave/restore.

export function TimelineEditor() {
  const editor = useEditor()
  const tracks = editor.timeline.getTracks()
  const duration = editor.timeline.getTotalDuration()
  const selectedCount = editor.selection.getSelected().length

  const { hydrated } = useAutosave()

  const sectionRef = useRef<HTMLElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)
  // Set when a clip is ingested so the next render fits the new content to the
  // viewport instead of leaving the view zoomed-in with a scrollbar.
  const fitRequestRef = useRef(false)

  const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null)

  useEditorShortcuts({ activeRef })

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
        fitRequestRef.current = true
      } catch (error) {
        console.error('Failed to add audio to timeline:', error)
        toast.error('音频解码失败，请重试')
      }
    },
    [],
  )

  // Drain "send to timeline" handoffs from the history cards. Gated on hydration
  // so a restore never races an incoming handoff; buffered items survive until
  // the editor is ready.
  useEffect(() => {
    if (!hydrated) return

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
  }, [ingest, hydrated])

  const handleLocalFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const name = file.name.replace(/\.[^./]+$/, '')
        void ingest({ file, name })
      }
    },
    [ingest],
  )

  // Reactive container width so the timeline refits (and stops overflowing)
  // whenever the surrounding resizable panel changes size.
  const [containerWidth, setContainerWidth] = useState(1000)
  useEffect(() => {
    const el = tracksContainerRef.current
    if (!el) return
    const measure = () => setContainerWidth(el.clientWidth || 1000)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  const { dragState, handleClipMouseDown, handleClipClick } =
    useClipInteraction({
      zoomLevel,
      tracksScrollRef,
      rowsRef,
      onSnapPointChange: setSnapPoint,
    })

  const selectionBox = useSelectionBox({
    rowsRef,
    tracksScrollRef,
    zoomLevel,
    onSelectionComplete: (clips) => editor.selection.setSelected({ clips }),
  })

  const reorderTrack = useCallback(
    ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const order = editor.timeline.getTracks().map((track) => track.id)
      const target = index + direction
      if (target < 0 || target >= order.length) return
      ;[order[index], order[target]] = [order[target], order[index]]
      editor.timeline.reorderTracks({ trackIds: order })
    },
    [editor],
  )

  const contentWidth =
    duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  const paddingPx = getTimelinePaddingPx({
    containerWidth,
    zoomLevel,
    minZoom: minZoomLevel,
  })
  // Only add the trailing scroll padding once the content actually overflows
  // the viewport; while it fits, pin the width to the container so no
  // horizontal scrollbar appears.
  const dynamicTimelineWidth =
    contentWidth > containerWidth ? contentWidth + paddingPx : containerWidth

  // After a clip is ingested, fit the (now longer) timeline to the viewport so
  // "send to timeline" lands on a clean fitted view rather than jumping to a
  // zoomed-in/scrolled state.
  useEffect(() => {
    if (!fitRequestRef.current || duration <= 0) return
    fitRequestRef.current = false
    setZoomLevel(getZoomToFit({ duration, containerWidth }))
  }, [duration, containerWidth, setZoomLevel])

  const totalTracksHeight =
    tracks.length * TRACK_HEIGHT + Math.max(0, tracks.length - 1) * TRACK_GAP

  return (
    <section
      ref={sectionRef}
      className="bg-card relative flex h-full flex-col overflow-hidden rounded-xl"
      aria-label="Audio timeline editor"
      onPointerEnter={() => {
        activeRef.current = true
      }}
      onPointerLeave={() => {
        activeRef.current = false
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <MediaDropzone onFiles={handleLocalFiles} />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => editor.timeline.addTrackWithHistory()}
          >
            <Plus className="size-4" />
            添加音轨
          </Button>
          <ExportButton />
        </div>
      </div>

      <TimelineToolbar
        zoomLevel={zoomLevel}
        minZoom={minZoomLevel}
        zoomToFitLevel={getZoomToFit({ duration, containerWidth })}
        setZoomLevel={setZoomLevel}
      />

      <div className="relative flex flex-1 overflow-hidden" ref={timelineRef}>
        {/* Track labels column (not horizontally scrolled) */}
        <div className="bg-card flex w-40 shrink-0 flex-col border-r">
          <div className="h-4 shrink-0" />
          <div className="flex flex-col gap-1 overflow-hidden pt-px">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center justify-between gap-1 px-2"
                style={{ height: `${TRACK_HEIGHT}px` }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Music className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate text-xs">{track.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => reorderTrack({ index, direction: -1 })}
                    disabled={index === 0}
                    title="上移"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => reorderTrack({ index, direction: 1 })}
                    disabled={index === tracks.length - 1}
                    title="下移"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor.timeline.toggleTrackSolo({ trackId: track.id })
                    }
                    title={track.solo ? '取消独奏' : '独奏'}
                  >
                    <Headphones
                      className={cn(
                        'size-4',
                        track.solo ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </button>
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
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                    onClick={() =>
                      editor.timeline.removeTrack({ trackId: track.id })
                    }
                    disabled={tracks.length <= 1}
                    title="删除音轨"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
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
            className="size-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-2.5"
            onWheel={handleWheel}
          >
            <div
              className="relative overflow-hidden"
              style={{ width: `${dynamicTimelineWidth}px` }}
            >
              <div className="bg-card sticky top-0 z-30">
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
                ref={rowsRef}
                className="relative flex flex-col gap-1"
                style={{ height: `${totalTracksHeight}px` }}
                onMouseDown={(event) => {
                  handleTracksMouseDown(event)
                  selectionBox.handleMouseDown(event)
                }}
                onClick={(event) => {
                  if (selectionBox.shouldIgnoreClick()) return
                  editor.selection.clear()
                  handleTracksClick(event)
                }}
              >
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={cn('relative w-full')}
                    style={{ height: `${TRACK_HEIGHT}px` }}
                  >
                    <TimelineTrackContent
                      track={track}
                      zoomLevel={zoomLevel}
                      dragState={dragState}
                      selectedCount={selectedCount}
                      onClipMouseDown={handleClipMouseDown}
                      onClipClick={handleClipClick}
                      onSnapPointChange={setSnapPoint}
                    />
                  </div>
                ))}
                <SnapIndicator
                  snapPoint={snapPoint}
                  zoomLevel={zoomLevel}
                  height={totalTracksHeight}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee selection overlay (client-coordinate space) */}
      {selectionBox.selectionBox?.isActive ? (
        <div
          className="border-primary bg-primary/10 pointer-events-none fixed z-50 border"
          style={{
            left: `${Math.min(
              selectionBox.selectionBox.startPos.x,
              selectionBox.selectionBox.currentPos.x,
            )}px`,
            top: `${Math.min(
              selectionBox.selectionBox.startPos.y,
              selectionBox.selectionBox.currentPos.y,
            )}px`,
            width: `${Math.abs(
              selectionBox.selectionBox.currentPos.x -
                selectionBox.selectionBox.startPos.x,
            )}px`,
            height: `${Math.abs(
              selectionBox.selectionBox.currentPos.y -
                selectionBox.selectionBox.startPos.y,
            )}px`,
          }}
        />
      ) : null}
    </section>
  )
}

export default TimelineEditor

import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FPS,
  TIMELINE_CONSTANTS,
  TRACK_GAP,
  TRACK_HEIGHT,
} from '@/editor/constants'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useTimelineSnapping } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useEditor } from '@/editor/hooks/use-editor'
import { snapTimeToFrame } from '@/editor/lib/time'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import type { AudioClip, AudioTrack } from '@/editor/types'

// Clip drag (within + across tracks) and selection. Ported from bycut's
// use-element-interaction, adapted to the audio editor's single-scroll layout:
// vertical target track is derived from the row grid (TRACK_HEIGHT + gap) rather
// than bycut's drop-target computation, and batch moves are time-only.

const DRAG_THRESHOLD_PX = 5
const ROW_STRIDE = TRACK_HEIGHT + TRACK_GAP

export interface ClipDragState {
  isDragging: boolean
  clipId: string | null
  trackId: string | null
  sourceTrackIndex: number
  startClipTime: number
  clickOffsetTime: number
  currentTime: number
  targetTrackIndex: number
}

const initialDragState: ClipDragState = {
  isDragging: false,
  clipId: null,
  trackId: null,
  sourceTrackIndex: 0,
  startClipTime: 0,
  clickOffsetTime: 0,
  currentTime: 0,
  targetTrackIndex: 0,
}

interface PendingDrag {
  clipId: string
  trackId: string
  sourceTrackIndex: number
  startMouseX: number
  startMouseY: number
  startClipTime: number
  clickOffsetTime: number
}

interface UseClipInteractionProps {
  zoomLevel: number
  tracksScrollRef: RefObject<HTMLDivElement | null>
  rowsRef: RefObject<HTMLDivElement | null>
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void
}

export function useClipInteraction({
  zoomLevel,
  tracksScrollRef,
  rowsRef,
  onSnapPointChange,
}: UseClipInteractionProps) {
  const editor = useEditor()
  const snappingEnabled = useTimelineUiStore((state) => state.snappingEnabled)
  const { snapClipEdge } = useTimelineSnapping()

  const [dragState, setDragState] = useState<ClipDragState>(initialDragState)
  const [isPendingDrag, setIsPendingDrag] = useState(false)
  const pendingRef = useRef<PendingDrag | null>(null)
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null)
  const dragStateRef = useRef(dragState)
  dragStateRef.current = dragState

  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

  const getMouseTime = useCallback(
    ({ clientX }: { clientX: number }): number => {
      const scroll = tracksScrollRef.current
      if (!scroll) return 0
      const rect = scroll.getBoundingClientRect()
      const x = clientX - rect.left + scroll.scrollLeft
      return Math.max(0, x / pixelsPerSecond)
    },
    [tracksScrollRef, pixelsPerSecond],
  )

  const getTargetTrackIndex = useCallback(
    ({ clientY }: { clientY: number }): number => {
      const rows = rowsRef.current
      const trackCount = editor.timeline.getTracks().length
      if (!rows || trackCount === 0) return 0
      const rect = rows.getBoundingClientRect()
      const index = Math.floor((clientY - rect.top) / ROW_STRIDE)
      return Math.max(0, Math.min(trackCount - 1, index))
    },
    [rowsRef, editor],
  )

  const resolveDragTime = useCallback(
    ({
      clientX,
      clip,
      clickOffsetTime,
    }: {
      clientX: number
      clip: AudioClip | undefined
      clickOffsetTime: number
    }): { time: number; snapPoint: SnapPoint | null } => {
      const mouseTime = getMouseTime({ clientX })
      const adjusted = Math.max(0, mouseTime - clickOffsetTime)
      const frameSnapped = snapTimeToFrame({ time: adjusted, fps: DEFAULT_FPS })

      if (!snappingEnabled || !clip) {
        return { time: frameSnapped, snapPoint: null }
      }

      const tracks = editor.timeline.getTracks()
      const playheadTime = editor.playback.getCurrentTime()
      const startSnap = snapClipEdge({
        targetTime: frameSnapped,
        clipDuration: clip.duration,
        tracks,
        playheadTime,
        zoomLevel,
        excludeClipId: clip.id,
        snapToStart: true,
      })
      const endSnap = snapClipEdge({
        targetTime: frameSnapped,
        clipDuration: clip.duration,
        tracks,
        playheadTime,
        zoomLevel,
        excludeClipId: clip.id,
        snapToStart: false,
      })
      const snap =
        startSnap.snapDistance <= endSnap.snapDistance ? startSnap : endSnap
      if (!snap.snapPoint) return { time: frameSnapped, snapPoint: null }
      return { time: snap.snappedTime, snapPoint: snap.snapPoint }
    },
    [getMouseTime, snappingEnabled, editor, snapClipEdge, zoomLevel],
  )

  const findClip = useCallback(
    ({ trackId, clipId }: { trackId: string; clipId: string }) => {
      const track = editor.timeline.getTracks().find((t) => t.id === trackId)
      return track?.clips.find((clip) => clip.id === clipId)
    },
    [editor],
  )

  const endDrag = useCallback(() => {
    setDragState(initialDragState)
    onSnapPointChange?.(null)
  }, [onSnapPointChange])

  // Move / pending-promotion loop
  useEffect(() => {
    if (!dragState.isDragging && !isPendingDrag) return

    const handleMove = (event: MouseEvent) => {
      const { clientX, clientY } = event

      if (isPendingDrag && pendingRef.current) {
        const pending = pendingRef.current
        const deltaX = Math.abs(clientX - pending.startMouseX)
        const deltaY = Math.abs(clientY - pending.startMouseY)
        if (deltaX <= DRAG_THRESHOLD_PX && deltaY <= DRAG_THRESHOLD_PX) return

        const clip = findClip({
          trackId: pending.trackId,
          clipId: pending.clipId,
        })
        const { time } = resolveDragTime({
          clientX,
          clip,
          clickOffsetTime: pending.clickOffsetTime,
        })
        setDragState({
          isDragging: true,
          clipId: pending.clipId,
          trackId: pending.trackId,
          sourceTrackIndex: pending.sourceTrackIndex,
          startClipTime: pending.startClipTime,
          clickOffsetTime: pending.clickOffsetTime,
          currentTime: time,
          targetTrackIndex: getTargetTrackIndex({ clientY }),
        })
        pendingRef.current = null
        setIsPendingDrag(false)
        return
      }

      const current = dragStateRef.current
      if (!current.isDragging || !current.clipId || !current.trackId) return
      const clip = findClip({
        trackId: current.trackId,
        clipId: current.clipId,
      })
      const { time, snapPoint } = resolveDragTime({
        clientX,
        clip,
        clickOffsetTime: current.clickOffsetTime,
      })
      onSnapPointChange?.(snapPoint)
      setDragState((prev) => ({
        ...prev,
        currentTime: time,
        targetTrackIndex: getTargetTrackIndex({ clientY }),
      }))
    }

    document.addEventListener('mousemove', handleMove)
    return () => document.removeEventListener('mousemove', handleMove)
  }, [
    dragState.isDragging,
    isPendingDrag,
    findClip,
    resolveDragTime,
    getTargetTrackIndex,
    onSnapPointChange,
  ])

  // Commit on mouse up
  useEffect(() => {
    if (!dragState.isDragging && !isPendingDrag) return

    const handleUp = () => {
      const current = dragStateRef.current
      if (isPendingDrag) {
        pendingRef.current = null
        setIsPendingDrag(false)
      }
      if (!current.isDragging || !current.clipId || !current.trackId) {
        return
      }

      const tracks = editor.timeline.getTracks()
      const targetTrack: AudioTrack | undefined =
        tracks[current.targetTrackIndex]
      const selected = editor.selection.getSelected()
      const isDraggedSelected = selected.some(
        (ref) =>
          ref.clipId === current.clipId && ref.trackId === current.trackId,
      )
      const hasBatch = isDraggedSelected && selected.length > 1
      const timeDelta = current.currentTime - current.startClipTime

      if (hasBatch) {
        if (timeDelta !== 0) {
          editor.timeline.moveClipsByDelta({ clips: selected, timeDelta })
        }
      } else if (targetTrack) {
        const sameSpot =
          targetTrack.id === current.trackId &&
          current.currentTime === current.startClipTime
        if (!sameSpot) {
          editor.timeline.moveClip({
            sourceTrackId: current.trackId,
            targetTrackId: targetTrack.id,
            clipId: current.clipId,
            newStartTime: current.currentTime,
          })
        }
      }

      endDrag()
    }

    document.addEventListener('mouseup', handleUp)
    return () => document.removeEventListener('mouseup', handleUp)
  }, [dragState.isDragging, isPendingDrag, editor, endDrag])

  const handleClipMouseDown = useCallback(
    ({
      event,
      clip,
      track,
    }: {
      event: React.MouseEvent
      clip: AudioClip
      track: AudioTrack
    }) => {
      if (event.button !== 0) return
      event.stopPropagation()
      mouseDownRef.current = { x: event.clientX, y: event.clientY }

      const isMultiKey = event.metaKey || event.ctrlKey || event.shiftKey
      const alreadySelected = editor.selection.isSelected({
        trackId: track.id,
        clipId: clip.id,
      })

      if (isMultiKey) {
        editor.selection.toggle({ trackId: track.id, clipId: clip.id })
      } else if (!alreadySelected) {
        editor.selection.setSelected({
          clips: [{ trackId: track.id, clipId: clip.id }],
        })
      }

      const clickOffsetX =
        event.clientX - event.currentTarget.getBoundingClientRect().left
      const clickOffsetTime = clickOffsetX / pixelsPerSecond
      const sourceTrackIndex = editor.timeline
        .getTracks()
        .findIndex((t) => t.id === track.id)

      pendingRef.current = {
        clipId: clip.id,
        trackId: track.id,
        sourceTrackIndex: Math.max(0, sourceTrackIndex),
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startClipTime: clip.startTime,
        clickOffsetTime,
      }
      setIsPendingDrag(true)
    },
    [editor, pixelsPerSecond],
  )

  const handleClipClick = useCallback(
    ({
      event,
      clip,
      track,
    }: {
      event: React.MouseEvent
      clip: AudioClip
      track: AudioTrack
    }) => {
      event.stopPropagation()
      if (mouseDownRef.current) {
        const deltaX = Math.abs(event.clientX - mouseDownRef.current.x)
        const deltaY = Math.abs(event.clientY - mouseDownRef.current.y)
        mouseDownRef.current = null
        if (deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX) return
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey) return

      const alreadySelected = editor.selection.isSelected({
        trackId: track.id,
        clipId: clip.id,
      })
      if (!alreadySelected) {
        editor.selection.setSelected({
          clips: [{ trackId: track.id, clipId: clip.id }],
        })
      }
    },
    [editor],
  )

  return { dragState, handleClipMouseDown, handleClipClick }
}

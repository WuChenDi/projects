import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_FPS, TIMELINE_CONSTANTS } from '@/editor/constants'
import { EditorCore } from '@/editor/core'
import type { SnapPoint } from '@/editor/hooks/timeline/use-timeline-snapping'
import { useTimelineSnapping } from '@/editor/hooks/timeline/use-timeline-snapping'
import { snapTimeToFrame } from '@/editor/lib/time'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import type { AudioClip, AudioTrack } from '@/editor/types'

// Left/right trim handles. Ported from bycut's use-element-resize with the
// audio simplifications: playbackRate is always 1 and clips never extend past
// their source (audio has no still-frame extension), so the trim/startTime/
// duration formulas reduce but stay numerically identical to bycut.

interface ResizeState {
  side: 'left' | 'right'
  startX: number
  initialTrimStart: number
  initialTrimEnd: number
  initialStartTime: number
  initialDuration: number
}

interface UseClipResizeProps {
  clip: AudioClip
  track: AudioTrack
  zoomLevel: number
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void
}

export function useClipResize({
  clip,
  track,
  zoomLevel,
  onSnapPointChange,
}: UseClipResizeProps) {
  const editor = EditorCore.getInstance()
  const snappingEnabled = useTimelineUiStore((state) => state.snappingEnabled)
  const { findSnapPoints, snapToNearestPoint } = useTimelineSnapping()

  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const [currentStartTime, setCurrentStartTime] = useState(clip.startTime)
  const [currentDuration, setCurrentDuration] = useState(clip.duration)
  const trimStartRef = useRef(clip.trimStart)
  const trimEndRef = useRef(clip.trimEnd)
  const startTimeRef = useRef(clip.startTime)
  const durationRef = useRef(clip.duration)

  const handleResizeStart = useCallback(
    ({ event, side }: { event: React.MouseEvent; side: 'left' | 'right' }) => {
      event.stopPropagation()
      event.preventDefault()

      setResizing({
        side,
        startX: event.clientX,
        initialTrimStart: clip.trimStart,
        initialTrimEnd: clip.trimEnd,
        initialStartTime: clip.startTime,
        initialDuration: clip.duration,
      })
      setCurrentStartTime(clip.startTime)
      setCurrentDuration(clip.duration)
      trimStartRef.current = clip.trimStart
      trimEndRef.current = clip.trimEnd
      startTimeRef.current = clip.startTime
      durationRef.current = clip.duration
    },
    [clip],
  )

  const updateFromMouseMove = useCallback(
    ({ clientX }: { clientX: number }) => {
      if (!resizing) return

      const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
      const deltaX = clientX - resizing.startX
      let deltaTime = deltaX / pixelsPerSecond
      let snapPoint: SnapPoint | null = null

      const fps = DEFAULT_FPS
      const minDurationSeconds = 1 / fps

      if (snappingEnabled) {
        const tracks = editor.timeline.getTracks()
        const playheadTime = editor.playback.getCurrentTime()
        const snapPoints = findSnapPoints({
          tracks,
          playheadTime,
          excludeClipId: clip.id,
        })
        if (resizing.side === 'left') {
          const targetStartTime = resizing.initialStartTime + deltaTime
          const snapResult = snapToNearestPoint({
            targetTime: targetStartTime,
            snapPoints,
            zoomLevel,
          })
          snapPoint = snapResult.snapPoint
          if (snapResult.snapPoint) {
            deltaTime = snapResult.snappedTime - resizing.initialStartTime
          }
        } else {
          const baseEndTime =
            resizing.initialStartTime + resizing.initialDuration
          const snapResult = snapToNearestPoint({
            targetTime: baseEndTime + deltaTime,
            snapPoints,
            zoomLevel,
          })
          snapPoint = snapResult.snapPoint
          if (snapResult.snapPoint) {
            deltaTime = snapResult.snappedTime - baseEndTime
          }
        }
      }
      onSnapPointChange?.(snapPoint)

      if (resizing.side === 'left') {
        const sourceDuration =
          resizing.initialTrimStart +
          resizing.initialDuration +
          resizing.initialTrimEnd
        const maxAllowed =
          sourceDuration - resizing.initialTrimEnd - minDurationSeconds
        const calculated = resizing.initialTrimStart + deltaTime

        const clampedTrimStart =
          calculated < 0 ? 0 : Math.min(maxAllowed, calculated)
        const newTrimStart = snapTimeToFrame({ time: clampedTrimStart, fps })
        const sourceTrimDelta = newTrimStart - resizing.initialTrimStart
        const newStartTime = snapTimeToFrame({
          time: resizing.initialStartTime + sourceTrimDelta,
          fps,
        })
        const newDuration = snapTimeToFrame({
          time: resizing.initialDuration - sourceTrimDelta,
          fps,
        })

        trimStartRef.current = newTrimStart
        startTimeRef.current = newStartTime
        durationRef.current = newDuration
        setCurrentStartTime(newStartTime)
        setCurrentDuration(newDuration)
      } else {
        const sourceDuration =
          resizing.initialTrimStart +
          resizing.initialDuration +
          resizing.initialTrimEnd
        const newTrimEndRaw = resizing.initialTrimEnd - deltaTime

        if (newTrimEndRaw < 0) {
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + resizing.initialTrimEnd,
            fps,
          })
          trimEndRef.current = 0
          durationRef.current = newDuration
          setCurrentDuration(newDuration)
        } else {
          const maxTrimEnd =
            sourceDuration - resizing.initialTrimStart - minDurationSeconds
          const clampedTrimEnd = Math.min(
            maxTrimEnd,
            Math.max(0, newTrimEndRaw),
          )
          const finalTrimEnd = snapTimeToFrame({ time: clampedTrimEnd, fps })
          const sourceTrimDelta = finalTrimEnd - resizing.initialTrimEnd
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration - sourceTrimDelta,
            fps,
          })
          trimEndRef.current = finalTrimEnd
          durationRef.current = newDuration
          setCurrentDuration(newDuration)
        }
      }
    },
    [
      resizing,
      zoomLevel,
      snappingEnabled,
      editor,
      findSnapPoints,
      snapToNearestPoint,
      clip.id,
      onSnapPointChange,
    ],
  )

  const handleResizeEnd = useCallback(() => {
    if (!resizing) return

    const finalTrimStart = trimStartRef.current
    const finalTrimEnd = trimEndRef.current
    const finalStartTime = startTimeRef.current
    const finalDuration = durationRef.current

    const changed =
      finalTrimStart !== resizing.initialTrimStart ||
      finalTrimEnd !== resizing.initialTrimEnd ||
      finalStartTime !== resizing.initialStartTime ||
      finalDuration !== resizing.initialDuration

    if (changed) {
      editor.timeline.updateClipTrim({
        clipId: clip.id,
        trimStart: finalTrimStart,
        trimEnd: finalTrimEnd,
        startTime: finalStartTime,
        duration: finalDuration,
      })
    }

    setResizing(null)
    onSnapPointChange?.(null)
  }, [resizing, editor.timeline, clip.id, onSnapPointChange])

  useEffect(() => {
    if (!resizing) return

    const onMove = ({ clientX }: MouseEvent) => updateFromMouseMove({ clientX })
    const onUp = () => handleResizeEnd()

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizing, updateFromMouseMove, handleResizeEnd])

  // Keep the local mirror in sync when the clip changes externally (undo/redo).
  useEffect(() => {
    if (resizing) return
    setCurrentStartTime(clip.startTime)
    setCurrentDuration(clip.duration)
    trimStartRef.current = clip.trimStart
    trimEndRef.current = clip.trimEnd
    startTimeRef.current = clip.startTime
    durationRef.current = clip.duration
  }, [resizing, clip.startTime, clip.duration, clip.trimStart, clip.trimEnd])

  return {
    isResizing: resizing !== null,
    handleResizeStart,
    currentStartTime,
    currentDuration,
  }
}

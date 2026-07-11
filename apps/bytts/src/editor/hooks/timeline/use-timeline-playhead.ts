import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_FPS, TIMELINE_CONSTANTS } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import { getSnappedSeekTime } from '@/editor/lib/time'

// Playhead scrubbing (drag the head or the ruler) + follow-during-playback
// auto-scroll. Ported from bycut, trimmed of edge auto-scroll and view-state
// persistence.

interface UseTimelinePlayheadProps {
  zoomLevel: number
  rulerRef: React.RefObject<HTMLDivElement | null>
  rulerScrollRef: React.RefObject<HTMLDivElement | null>
  tracksScrollRef: React.RefObject<HTMLDivElement | null>
  playheadRef?: React.RefObject<HTMLDivElement | null>
}

export function useTimelinePlayhead({
  zoomLevel,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: UseTimelinePlayheadProps) {
  const editor = useEditor()
  const currentTime = editor.playback.getCurrentTime()
  const duration = editor.timeline.getTotalDuration()
  const isPlaying = editor.playback.getIsPlaying()
  const isScrubbing = editor.playback.getIsScrubbing()

  const seek = useCallback(
    ({ time }: { time: number }) => editor.playback.seek({ time }),
    [editor.playback],
  )

  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [isDraggingRuler, setIsDraggingRuler] = useState(false)
  const [hasDraggedRuler, setHasDraggedRuler] = useState(false)

  // Follow-during-playback can be paused by the user: once they scroll away
  // mid-playback we stop yanking the viewport back to the playhead. Following
  // resumes when playback (re)starts or a deliberate scrub/seek happens.
  const followPausedRef = useRef(false)
  const programmaticScrollRef = useRef(false)
  const wasPlayingRef = useRef(isPlaying)
  const wasScrubbingRef = useRef(isScrubbing)

  const playheadPosition =
    isScrubbing && scrubTime !== null ? scrubTime : currentTime

  const handleScrub = useCallback(
    ({ event }: { event: MouseEvent | React.MouseEvent }) => {
      const ruler = rulerRef.current
      if (!ruler) return
      const rulerRect = ruler.getBoundingClientRect()
      const relativeMouseX = event.clientX - rulerRect.left

      const timelineContentWidth =
        duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
      const clampedMouseX = Math.max(
        0,
        Math.min(timelineContentWidth, relativeMouseX),
      )

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          clampedMouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
        ),
      )
      const time = getSnappedSeekTime({ rawTime, duration, fps: DEFAULT_FPS })

      setScrubTime(time)
      seek({ time })
    },
    [duration, zoomLevel, seek, rulerRef],
  )

  const handlePlayheadMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      editor.playback.setScrubbing({ isScrubbing: true })
      handleScrub({ event })
    },
    [handleScrub, editor.playback],
  )

  const handleRulerMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return
      if (playheadRef?.current?.contains(event.target as Node)) return

      event.preventDefault()
      setIsDraggingRuler(true)
      setHasDraggedRuler(false)

      editor.playback.setScrubbing({ isScrubbing: true })
      handleScrub({ event })
    },
    [handleScrub, playheadRef, editor.playback],
  )

  useEffect(() => {
    if (!isScrubbing) return

    const onMouseMove = (event: MouseEvent) => {
      handleScrub({ event })
      if (isDraggingRuler) setHasDraggedRuler(true)
    }

    const onMouseUp = (event: MouseEvent) => {
      editor.playback.setScrubbing({ isScrubbing: false })
      if (scrubTime !== null) seek({ time: scrubTime })
      setScrubTime(null)

      if (isDraggingRuler) {
        setIsDraggingRuler(false)
        if (!hasDraggedRuler) handleScrub({ event })
        setHasDraggedRuler(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [
    isScrubbing,
    scrubTime,
    seek,
    handleScrub,
    isDraggingRuler,
    hasDraggedRuler,
    editor,
  ])

  // Resume following whenever playback (re)starts or a deliberate scrub ends.
  useEffect(() => {
    if (
      (isPlaying && !wasPlayingRef.current) ||
      (wasScrubbingRef.current && !isScrubbing)
    ) {
      followPausedRef.current = false
    }
    wasPlayingRef.current = isPlaying
    wasScrubbingRef.current = isScrubbing
  }, [isPlaying, isScrubbing])

  // A manual scroll during playback pauses following. Programmatic follow
  // writes below flag themselves so they don't self-trigger this.
  useEffect(() => {
    const el = tracksScrollRef.current
    if (!el) return
    const onScroll = () => {
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false
        return
      }
      if (editor.playback.getIsPlaying()) followPausedRef.current = true
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [tracksScrollRef, editor.playback])

  useEffect(() => {
    if (!isPlaying || isScrubbing || followPausedRef.current) return

    const rulerViewport = rulerScrollRef.current
    const tracksViewport = tracksScrollRef.current
    if (!rulerViewport || !tracksViewport) return

    const playheadPixels =
      playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
    const viewportWidth = rulerViewport.clientWidth
    const scrollMaximum = rulerViewport.scrollWidth - viewportWidth

    const needsScroll =
      playheadPixels < rulerViewport.scrollLeft ||
      playheadPixels > rulerViewport.scrollLeft + viewportWidth

    if (needsScroll) {
      const desiredScroll = Math.max(
        0,
        Math.min(scrollMaximum, playheadPixels - viewportWidth / 2),
      )
      if (Math.abs(rulerViewport.scrollLeft - desiredScroll) > 0.5) {
        programmaticScrollRef.current = true
        rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll
      }
    }
  }, [
    playheadPosition,
    zoomLevel,
    rulerScrollRef,
    tracksScrollRef,
    isScrubbing,
    isPlaying,
    editor.playback,
  ])

  return {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
  }
}

import type { MutableRefObject, RefObject } from 'react'
import { useCallback, useRef } from 'react'
import { DEFAULT_FPS, TIMELINE_CONSTANTS } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import { getSnappedSeekTime } from '@/editor/lib/time'

// Click-to-seek on the ruler and track area. Ported from bycut, trimmed of
// selection + view-state persistence. A small down/up delta guard keeps a
// click from firing mid-drag.

interface UseTimelineSeekProps {
  playheadRef: RefObject<HTMLDivElement | null>
  rulerScrollRef: RefObject<HTMLDivElement | null>
  tracksScrollRef: RefObject<HTMLDivElement | null>
  zoomLevel: number
  duration: number
}

interface MouseTracking {
  isMouseDown: boolean
  downX: number
  downY: number
  downTime: number
}

function resetMouseTracking(ref: MutableRefObject<MouseTracking>) {
  ref.current = { isMouseDown: false, downX: 0, downY: 0, downTime: 0 }
}

function setMouseTracking(
  ref: MutableRefObject<MouseTracking>,
  event: React.MouseEvent,
) {
  ref.current = {
    isMouseDown: true,
    downX: event.clientX,
    downY: event.clientY,
    downTime: event.timeStamp,
  }
}

export function useTimelineSeek({
  playheadRef,
  rulerScrollRef,
  tracksScrollRef,
  zoomLevel,
  duration,
}: UseTimelineSeekProps) {
  const editor = useEditor()
  const mouseTrackingRef = useRef<MouseTracking>({
    isMouseDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  })

  const handleTracksMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return
    setMouseTracking(mouseTrackingRef, event)
  }, [])

  const handleRulerMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return
    setMouseTracking(mouseTrackingRef, event)
  }, [])

  const shouldProcessClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement
      const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current
      const deltaX = Math.abs(event.clientX - downX)
      const deltaY = Math.abs(event.clientY - downY)
      const deltaTime = event.timeStamp - downTime
      const isPlayhead = !!playheadRef.current?.contains(target)
      const shouldBlockForDrag = deltaX > 5 || deltaY > 5 || deltaTime > 500

      if (!isMouseDown) return false
      if (shouldBlockForDrag) return false
      if (isPlayhead) return false
      return true
    },
    [playheadRef],
  )

  const seekAt = useCallback(
    ({
      event,
      source,
    }: {
      event: React.MouseEvent
      source: 'ruler' | 'tracks'
    }) => {
      const scrollContainer =
        source === 'ruler' ? rulerScrollRef.current : tracksScrollRef.current
      if (!scrollContainer) return

      const rect = scrollContainer.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const scrollLeft = scrollContainer.scrollLeft

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          (mouseX + scrollLeft) /
            (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
        ),
      )

      const time = getSnappedSeekTime({ rawTime, duration, fps: DEFAULT_FPS })
      editor.playback.seek({ time })
    },
    [duration, zoomLevel, rulerScrollRef, tracksScrollRef, editor],
  )

  const handleTracksClick = useCallback(
    (event: React.MouseEvent) => {
      const shouldProcess = shouldProcessClick(event)
      resetMouseTracking(mouseTrackingRef)
      if (shouldProcess) seekAt({ event, source: 'tracks' })
    },
    [shouldProcessClick, seekAt],
  )

  const handleRulerClick = useCallback(
    (event: React.MouseEvent) => {
      const shouldProcess = shouldProcessClick(event)
      resetMouseTracking(mouseTrackingRef)
      if (shouldProcess) seekAt({ event, source: 'ruler' })
    },
    [shouldProcessClick, seekAt],
  )

  return {
    handleTracksMouseDown,
    handleTracksClick,
    handleRulerMouseDown,
    handleRulerClick,
  }
}

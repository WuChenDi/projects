import type { WheelEvent as ReactWheelEvent, RefObject } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { TIMELINE_CONSTANTS } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import { zoomToSlider } from '@/editor/lib/zoom-utils'

// Zoom state + ctrl/⌘-wheel zoom. Ported from bycut, trimmed of the project
// view-state persistence (restored in FEAT-027). Keeps the playhead-anchored
// scroll compensation so zooming holds the playhead roughly in place.

interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement | null>
  minZoom?: number
  tracksScrollRef: RefObject<HTMLDivElement | null>
  rulerScrollRef: RefObject<HTMLDivElement | null>
}

interface UseTimelineZoomReturn {
  zoomLevel: number
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void
  handleWheel: (event: ReactWheelEvent) => void
}

export function useTimelineZoom({
  containerRef,
  minZoom = TIMELINE_CONSTANTS.ZOOM_MIN,
  tracksScrollRef,
  rulerScrollRef,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
  const editor = useEditor()

  const [zoomLevel, setZoomLevelRaw] = useState(minZoom)
  const previousZoomRef = useRef(zoomLevel)
  const preZoomScrollLeftRef = useRef(0)

  const setZoomLevel = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const scrollElement = tracksScrollRef.current
      if (scrollElement) {
        preZoomScrollLeftRef.current = scrollElement.scrollLeft
      }
      setZoomLevelRaw((prev) => {
        const nextZoom = typeof updater === 'function' ? updater(prev) : updater
        return Math.max(
          minZoom,
          Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, nextZoom),
        )
      })
    },
    [tracksScrollRef, minZoom],
  )

  const handleWheel = useCallback(
    (event: ReactWheelEvent) => {
      const isZoomGesture = event.ctrlKey || event.metaKey
      const isHorizontalScrollGesture =
        event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)

      if (isHorizontalScrollGesture) return

      if (isZoomGesture) {
        const zoomMultiplier = event.deltaY > 0 ? 1 / 1.1 : 1.1
        setZoomLevel((prev) => prev * zoomMultiplier)
      }
    },
    [setZoomLevel],
  )

  // clamp when the container-driven minimum grows past the current level
  useEffect(() => {
    setZoomLevel((prev) => (prev < minZoom ? minZoom : prev))
  }, [minZoom, setZoomLevel])

  useLayoutEffect(() => {
    const previousZoom = previousZoomRef.current
    if (previousZoom === zoomLevel) return

    const scrollElement = tracksScrollRef.current
    if (!scrollElement) {
      previousZoomRef.current = zoomLevel
      return
    }

    const currentScrollLeft = preZoomScrollLeftRef.current
    const playheadTime = editor.playback.getCurrentTime()
    const sliderPercent = zoomToSlider({ zoomLevel, minZoom })

    if (sliderPercent >= TIMELINE_CONSTANTS.ZOOM_ANCHOR_PLAYHEAD_THRESHOLD) {
      const playheadPixelsBefore =
        playheadTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * previousZoom
      const playheadPixelsAfter =
        playheadTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

      const viewportOffset = playheadPixelsBefore - currentScrollLeft
      const newScrollLeft = playheadPixelsAfter - viewportOffset

      const maxScrollLeft =
        scrollElement.scrollWidth - scrollElement.clientWidth
      const clampedScrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, newScrollLeft),
      )

      scrollElement.scrollLeft = clampedScrollLeft
      if (rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft = clampedScrollLeft
      }
    }

    previousZoomRef.current = zoomLevel
  }, [zoomLevel, editor, tracksScrollRef, rulerScrollRef, minZoom])

  // prevent browser page zoom while pinching inside the timeline
  useEffect(() => {
    const preventZoom = (event: WheelEvent) => {
      const isZoomKeyPressed = event.ctrlKey || event.metaKey
      const isInContainer = containerRef.current?.contains(event.target as Node)
      if (isZoomKeyPressed && isInContainer) {
        event.preventDefault()
      }
    }

    document.addEventListener('wheel', preventZoom, {
      passive: false,
      capture: true,
    })

    return () => {
      document.removeEventListener('wheel', preventZoom, { capture: true })
    }
  }, [containerRef])

  return { zoomLevel, setZoomLevel, handleWheel }
}

import { Bookmark } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants'
import { useEditor } from '@/hooks/use-editor'
import { getSnappedSeekTime } from '@/lib/time'

interface TimelineBookmarksRowProps {
  zoomLevel: number
  dynamicTimelineWidth: number
  handleWheel: (e: React.WheelEvent) => void
  handleTimelineContentClick: (e: React.MouseEvent) => void
  handleRulerTrackingMouseDown: (e: React.MouseEvent) => void
  handleRulerMouseDown: (e: React.MouseEvent) => void
}

export function TimelineBookmarksRow({
  zoomLevel,
  dynamicTimelineWidth,
  handleWheel,
  handleTimelineContentClick,
  handleRulerTrackingMouseDown,
  handleRulerMouseDown,
}: TimelineBookmarksRowProps) {
  const editor = useEditor()
  const activeScene = editor.scenes.getActiveScene()

  return (
    <div className="relative h-4 flex-1 overflow-hidden">
      <button
        className="relative h-4 w-full cursor-default select-none border-0 bg-transparent p-0"
        style={{
          width: `${dynamicTimelineWidth}px`,
        }}
        aria-label="Timeline ruler"
        type="button"
        onWheel={handleWheel}
        onClick={handleTimelineContentClick}
        onMouseDown={(event) => {
          handleRulerMouseDown(event)
          handleRulerTrackingMouseDown(event)
        }}
      >
        {activeScene.bookmarks.map((time: number) => (
          <TimelineBookmark
            key={`bookmark-row-${time}`}
            time={time}
            zoomLevel={zoomLevel}
          />
        ))}
      </button>
    </div>
  )
}

export function TimelineBookmark({
  time,
  zoomLevel,
}: {
  time: number
  zoomLevel: number
}) {
  const editor = useEditor()
  const activeProject = editor.project.getActive()
  const duration = editor.timeline.getTotalDuration()
  const fps = activeProject?.settings.fps ?? 30

  const [isDragging, setIsDragging] = useState(false)
  const [dragLeft, setDragLeft] = useState<number | null>(null)
  const dragStartXRef = useRef(0)
  const originalLeftRef = useRef(0)
  const didDragRef = useRef(false)

  const baseLeft = time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

  const handleBookmarkActivate = ({
    event,
  }: {
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>
  }) => {
    event.stopPropagation()
    const snappedTime = getSnappedSeekTime({
      rawTime: time,
      duration,
      fps,
    })
    editor.playback.seek({ time: snappedTime })
  }

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const deltaX = event.clientX - dragStartXRef.current
    if (Math.abs(deltaX) > 2) {
      didDragRef.current = true
    }
    const newLeft = Math.max(0, originalLeftRef.current + deltaX)
    setDragLeft(newLeft)
  }, [])

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      setIsDragging(false)

      if (!didDragRef.current) {
        setDragLeft(null)
        return
      }

      const deltaX = event.clientX - dragStartXRef.current
      const newLeft = Math.max(0, originalLeftRef.current + deltaX)
      const newTime =
        newLeft / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel)
      const clampedTime = Math.max(0, Math.min(duration, newTime))
      const snappedTime = getSnappedSeekTime({
        rawTime: clampedTime,
        duration,
        fps,
      })

      void editor.scenes.moveBookmark({ fromTime: time, toTime: snappedTime })
      setDragLeft(null)
    },
    [handleMouseMove, zoomLevel, duration, fps, time, editor.scenes],
  )

  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragStartXRef.current = event.clientX
    originalLeftRef.current = baseLeft
    didDragRef.current = false
    setIsDragging(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const displayLeft = dragLeft ?? baseLeft

  return (
    <button
      className={`absolute top-0 h-10 w-0.5 cursor-pointer border-0 bg-transparent p-0 ${
        isDragging ? 'cursor-grabbing z-20' : 'cursor-grab'
      }`}
      style={{
        left: `${displayLeft}px`,
      }}
      aria-label={`Seek to bookmark at ${time}s`}
      type="button"
      onMouseDown={handleMouseDown}
      onClick={(event) => {
        event.stopPropagation()
        if (didDragRef.current) {
          return
        }
        handleBookmarkActivate({ event })
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleBookmarkActivate({ event })
      }}
    >
      <div className="text-primary absolute -top-px -left-1.25">
        <Bookmark aria-hidden="true" className="fill-primary size-3" />
      </div>
    </button>
  )
}

'use client'

import type { JSX } from 'react'
import { DEFAULT_FPS, TIMELINE_CONSTANTS } from '@/editor/constants'
import { useScrollPosition } from '@/editor/hooks/timeline/use-scroll-position'
import { useEditor } from '@/editor/hooks/use-editor'
import { getRulerConfig, shouldShowLabel } from '@/editor/lib/ruler-utils'
import { TimelineTick } from './timeline-tick'

// Virtualized ruler. Ported from bycut, trimmed to the fixed audio fps and the
// single scroll container (ruler + tracks share one scroll element).

interface TimelineRulerProps {
  zoomLevel: number
  dynamicTimelineWidth: number
  rulerRef: React.Ref<HTMLDivElement>
  tracksScrollRef: React.RefObject<HTMLElement | null>
  handleWheel: (e: React.WheelEvent) => void
  handleRulerClick: (e: React.MouseEvent) => void
  handleRulerTrackingMouseDown: (e: React.MouseEvent) => void
  handleRulerMouseDown: (e: React.MouseEvent) => void
}

export function TimelineRuler({
  zoomLevel,
  dynamicTimelineWidth,
  rulerRef,
  tracksScrollRef,
  handleWheel,
  handleRulerClick,
  handleRulerTrackingMouseDown,
  handleRulerMouseDown,
}: TimelineRulerProps) {
  const editor = useEditor()
  const duration = editor.timeline.getTotalDuration()
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  const visibleDuration = dynamicTimelineWidth / pixelsPerSecond
  const effectiveDuration = Math.max(duration, visibleDuration)

  const { labelIntervalSeconds, tickIntervalSeconds } = getRulerConfig({
    zoomLevel,
    fps: DEFAULT_FPS,
  })
  const tickCount = Math.ceil(effectiveDuration / tickIntervalSeconds) + 1

  const { scrollLeft, viewportWidth } = useScrollPosition({
    scrollRef: tracksScrollRef,
  })

  const bufferPx = 200
  const visibleStartTime = Math.max(
    0,
    (scrollLeft - bufferPx) / pixelsPerSecond,
  )
  const visibleEndTime =
    (scrollLeft + viewportWidth + bufferPx) / pixelsPerSecond

  const startTickIndex = Math.max(
    0,
    Math.floor(visibleStartTime / tickIntervalSeconds),
  )
  const endTickIndex = Math.min(
    tickCount - 1,
    Math.ceil(visibleEndTime / tickIntervalSeconds),
  )

  const timelineTicks: Array<JSX.Element> = []
  for (
    let tickIndex = startTickIndex;
    tickIndex <= endTickIndex;
    tickIndex += 1
  ) {
    const time = tickIndex * tickIntervalSeconds
    if (time > effectiveDuration) break

    const showLabel = shouldShowLabel({ time, labelIntervalSeconds })
    timelineTicks.push(
      <TimelineTick
        key={tickIndex}
        time={time}
        zoomLevel={zoomLevel}
        fps={DEFAULT_FPS}
        showLabel={showLabel}
      />,
    )
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Timeline ruler"
      aria-valuemin={0}
      aria-valuemax={effectiveDuration}
      aria-valuenow={0}
      className="relative h-4 flex-1 overflow-x-visible"
      onWheel={handleWheel}
      onClick={handleRulerClick}
      onMouseDown={handleRulerTrackingMouseDown}
      onKeyDown={() => {}}
    >
      <div
        role="none"
        ref={rulerRef}
        className="relative h-4 cursor-default select-none"
        style={{ width: `${dynamicTimelineWidth}px` }}
        onMouseDown={handleRulerMouseDown}
      >
        {timelineTicks}
      </div>
    </div>
  )
}

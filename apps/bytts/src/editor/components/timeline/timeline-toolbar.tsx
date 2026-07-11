'use client'

import { Button } from '@cdlab/ui/components/button'
import { Separator } from '@cdlab/ui/components/separator'
import { Slider } from '@cdlab/ui/components/slider'
import { Maximize2, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react'
import { TIMELINE_CONSTANTS } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import { formatTimestamp } from '@/editor/lib/time'
import { sliderToZoom, zoomToSlider } from '@/editor/lib/zoom-utils'

// Lean transport + zoom bar. The split/undo/snap tools from bycut's toolbar
// belong to later tasks and are omitted.

interface TimelineToolbarProps {
  zoomLevel: number
  minZoom: number
  zoomToFitLevel: number
  setZoomLevel: (zoom: number) => void
}

export function TimelineToolbar({
  zoomLevel,
  minZoom,
  zoomToFitLevel,
  setZoomLevel,
}: TimelineToolbarProps) {
  const editor = useEditor()
  const isPlaying = editor.playback.getIsPlaying()
  const currentTime = editor.playback.getCurrentTime()
  const duration = editor.timeline.getTotalDuration()

  const sliderValue = zoomToSlider({ zoomLevel, minZoom }) * 100

  const handleZoomButton = ({ direction }: { direction: 'in' | 'out' }) => {
    const next =
      direction === 'in'
        ? zoomLevel * TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR
        : zoomLevel / TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR
    setZoomLevel(Math.max(minZoom, Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, next)))
  }

  return (
    <div className="flex h-10 items-center justify-between border-b px-2 py-1">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.playback.toggle()}
          title={isPlaying ? '暂停' : '播放'}
          disabled={duration <= 0}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {formatTimestamp({ timeInSeconds: currentTime })} /{' '}
          {formatTimestamp({ timeInSeconds: duration })}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleZoomButton({ direction: 'out' })}
          title="缩小"
        >
          <ZoomOut className="size-4" />
        </Button>
        <Slider
          className="w-28"
          min={0}
          max={100}
          step={1}
          value={[sliderValue]}
          onValueChange={([value]) =>
            setZoomLevel(sliderToZoom({ sliderPosition: value / 100, minZoom }))
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleZoomButton({ direction: 'in' })}
          title="放大"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoomLevel(zoomToFitLevel)}
          title="适应窗口"
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

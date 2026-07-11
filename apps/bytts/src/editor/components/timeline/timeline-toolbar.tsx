'use client'

import { Button } from '@cdlab/ui/components/button'
import { Separator } from '@cdlab/ui/components/separator'
import { Slider } from '@cdlab/ui/components/slider'
import {
  Copy,
  Magnet,
  Maximize2,
  Pause,
  Play,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { TIMELINE_CONSTANTS } from '@/editor/constants'
import { useEditorActions } from '@/editor/hooks/timeline/use-editor-actions'
import { useEditor } from '@/editor/hooks/use-editor'
import { formatTimestamp } from '@/editor/lib/time'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import { sliderToZoom, zoomToSlider } from '@/editor/lib/zoom-utils'

// Transport + editing + zoom bar. The split/duplicate/delete/undo/redo tools and
// the snap toggle route through the same actions the keyboard shortcuts use.

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
  const actions = useEditorActions()
  const snappingEnabled = useTimelineUiStore((state) => state.snappingEnabled)
  const toggleSnapping = useTimelineUiStore((state) => state.toggleSnapping)

  const isPlaying = editor.playback.getIsPlaying()
  const currentTime = editor.playback.getCurrentTime()
  const duration = editor.timeline.getTotalDuration()
  const selectedCount = editor.selection.getSelected().length
  const hasClips = editor.timeline
    .getTracks()
    .some((track) => track.clips.length > 0)

  const sliderValue = zoomToSlider({ zoomLevel, minZoom }) * 100

  const handleZoomButton = ({ direction }: { direction: 'in' | 'out' }) => {
    const next =
      direction === 'in'
        ? zoomLevel * TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR
        : zoomLevel / TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR
    setZoomLevel(Math.max(minZoom, Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, next)))
  }

  return (
    <div className="flex h-10 items-center justify-between gap-2 border-b px-2 py-1">
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

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.split}
          title="分割 (S)"
          disabled={!hasClips}
        >
          <Scissors className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.duplicate}
          title="复制 (Ctrl+D)"
          disabled={selectedCount === 0}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.deleteSelected}
          title="删除 (Delete)"
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.undo}
          title="撤销 (Ctrl+Z)"
          disabled={!editor.command.canUndo()}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.redo}
          title="重做 (Shift+Ctrl+Z)"
          disabled={!editor.command.canRedo()}
        >
          <Redo2 className="size-4" />
        </Button>

        <Button
          variant={snappingEnabled ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={toggleSnapping}
          title={snappingEnabled ? '关闭吸附' : '开启吸附'}
        >
          <Magnet className="size-4" />
        </Button>
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

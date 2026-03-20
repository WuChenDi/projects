'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { Slider } from '@cdlab996/ui/components/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { cn } from '@cdlab996/ui/lib/utils'
import {
  AlignEndHorizontal,
  AlignStartHorizontal,
  Bookmark,
  Copy,
  Link,
  Magnet,
  Scissors,
  Snowflake,
  SplitSquareHorizontal,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants'
import { useEditor } from '@/hooks/use-editor'
import type { TAction } from '@/lib/actions'
import { invokeAction } from '@/lib/actions'
import { sliderToZoom, zoomToSlider } from '@/lib/timeline/zoom-utils'
import { useTimelineStore } from '@/stores/timeline-store'

export function TimelineToolbar({
  zoomLevel,
  minZoom,
  setZoomLevel,
}: {
  zoomLevel: number
  minZoom: number
  setZoomLevel: ({ zoom }: { zoom: number }) => void
}) {
  const handleZoom = ({ direction }: { direction: 'in' | 'out' }) => {
    const newZoomLevel =
      direction === 'in'
        ? Math.min(
            TIMELINE_CONSTANTS.ZOOM_MAX,
            zoomLevel * TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR,
          )
        : Math.max(minZoom, zoomLevel / TIMELINE_CONSTANTS.ZOOM_BUTTON_FACTOR)
    setZoomLevel({ zoom: newZoomLevel })
  }

  return (
    <ScrollArea className="scrollbar-hidden">
      <div className="flex h-10 items-center justify-between border-b px-2 py-1">
        <ToolbarLeftSection />

        <ToolbarRightSection
          zoomLevel={zoomLevel}
          minZoom={minZoom}
          onZoomChange={(zoom) => setZoomLevel({ zoom })}
          onZoom={handleZoom}
        />
      </div>
    </ScrollArea>
  )
}

function ToolbarLeftSection() {
  const t = useTranslations()
  const editor = useEditor()
  const currentTime = editor.playback.getCurrentTime()
  const currentBookmarked = editor.scenes.isBookmarked({ time: currentTime })

  const handleAction = ({
    action,
    event,
  }: {
    action: TAction
    event: React.MouseEvent
  }) => {
    event.stopPropagation()
    invokeAction(action)
  }

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={500}>
        <ToolbarButton
          icon={<Scissors />}
          tooltip={t('timeline.splitElement')}
          onClick={({ event }) => handleAction({ action: 'split', event })}
        />

        <ToolbarButton
          icon={<AlignStartHorizontal />}
          tooltip={t('timeline.splitLeft')}
          onClick={({ event }) => handleAction({ action: 'split-left', event })}
        />

        <ToolbarButton
          icon={<AlignEndHorizontal />}
          tooltip={t('timeline.splitRight')}
          onClick={({ event }) =>
            handleAction({ action: 'split-right', event })
          }
        />

        <ToolbarButton
          icon={<SplitSquareHorizontal />}
          tooltip={t('common.comingSoon')}
          disabled={true}
          onClick={({ event: _event }) => {}}
        />

        <ToolbarButton
          icon={<Copy />}
          tooltip={t('timeline.duplicateElement')}
          onClick={({ event }) =>
            handleAction({ action: 'duplicate-selected', event })
          }
        />

        <ToolbarButton
          icon={<Snowflake />}
          tooltip={t('common.comingSoon')}
          disabled={true}
          onClick={({ event: _event }) => {}}
        />

        <ToolbarButton
          icon={<Trash2 />}
          tooltip={t('timeline.deleteElement')}
          onClick={({ event }) =>
            handleAction({ action: 'delete-selected', event })
          }
        />

        <div className="bg-border mx-1 h-6 w-px" />

        <Tooltip>
          <ToolbarButton
            icon={<Bookmark />}
            isActive={currentBookmarked}
            tooltip={
              currentBookmarked
                ? t('timeline.removeBookmark')
                : t('timeline.addBookmark')
            }
            onClick={({ event }) =>
              handleAction({ action: 'toggle-bookmark', event })
            }
          />
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function ToolbarRightSection({
  zoomLevel,
  minZoom,
  onZoomChange,
  onZoom,
}: {
  zoomLevel: number
  minZoom: number
  onZoomChange: (zoom: number) => void
  onZoom: (options: { direction: 'in' | 'out' }) => void
}) {
  const t = useTranslations()
  const {
    snappingEnabled,
    rippleEditingEnabled,
    toggleSnapping,
    toggleRippleEditing,
  } = useTimelineStore()

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={500}>
        <ToolbarButton
          icon={<Magnet />}
          isActive={snappingEnabled}
          tooltip={t('timeline.autoSnapping')}
          onClick={() => toggleSnapping()}
        />

        <ToolbarButton
          icon={<Link className="scale-110" />}
          isActive={rippleEditingEnabled}
          tooltip={t('timeline.rippleEditing')}
          onClick={() => toggleRippleEditing()}
        />
      </TooltipProvider>

      <div className="bg-border mx-1 h-6 w-px" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => onZoom({ direction: 'out' })}
        >
          <ZoomOut />
        </Button>
        <Slider
          className="w-28"
          value={[zoomToSlider({ zoomLevel, minZoom })]}
          onValueChange={(values) =>
            onZoomChange(sliderToZoom({ sliderPosition: values[0], minZoom }))
          }
          min={0}
          max={1}
          step={0.005}
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => onZoom({ direction: 'in' })}
        >
          <ZoomIn />
        </Button>
      </div>
    </div>
  )
}

function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled,
  isActive,
}: {
  icon: React.ReactNode
  tooltip: string
  onClick: ({ event }: { event: React.MouseEvent }) => void
  disabled?: boolean
  isActive?: boolean
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="icon"
          type="button"
          onClick={(event) => onClick({ event })}
          className={cn(
            'rounded-sm',
            disabled ? 'cursor-not-allowed opacity-50' : '',
          )}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

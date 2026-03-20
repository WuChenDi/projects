import { Music, Smile, Type, Video } from 'lucide-react'
import type { TTimelineViewState } from '@/types/project'
import type { TrackType } from '@/types/timeline'

export const TRACK_COLORS: Record<TrackType, { background: string }> = {
  video: {
    background: 'transparent',
  },
  text: {
    background: 'bg-[#5DBAA0]',
  },
  audio: {
    background: 'bg-[#915DBE]',
  },
  sticker: {
    background: 'bg-amber-500',
  },
} as const

export const TRACK_HEIGHTS: Record<TrackType, number> = {
  video: 60,
  text: 25,
  audio: 50,
  sticker: 50,
} as const

export const TRACK_GAP = 4

export const TIMELINE_CONSTANTS = {
  PIXELS_PER_SECOND: 50,
  DEFAULT_ELEMENT_DURATION: 5,
  PADDING_TOP_PX: 0,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 100,
  ZOOM_BUTTON_FACTOR: 1.7,
  ZOOM_ANCHOR_PLAYHEAD_THRESHOLD: 0.15,
} as const

export const DEFAULT_TIMELINE_VIEW_STATE: TTimelineViewState = {
  zoomLevel: 1,
  scrollLeft: 0,
  playheadTime: 0,
}

export const TRACK_ICONS: Record<TrackType, React.ReactNode> = {
  video: <Video className="text-muted-foreground size-4 shrink-0" />,
  text: <Type className="text-muted-foreground size-4 shrink-0" />,
  audio: <Music className="text-muted-foreground size-4 shrink-0" />,
  sticker: <Smile className="text-muted-foreground size-4 shrink-0" />,
} as const

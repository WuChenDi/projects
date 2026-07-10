import { Button } from '@cdlab/ui/components/button'
import { TrashIcon } from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { MediaItemCard } from '@/components/ui/MediaItemCard'
import type { VideoHistoryItem } from '@/lib/types'
import { formatTime } from '@/lib/utils/format-utils'

interface HistoryItemProps {
  item: VideoHistoryItem
  onRemove: () => void
  isPremium?: boolean
}

export function HistoryItem({
  item,
  onRemove,
  isPremium = false,
}: HistoryItemProps) {
  const getVideoUrl = (): string => {
    const params = new URLSearchParams({
      id: item.videoId.toString(),
      source: item.source,
      title: item.title,
      episode: item.episodeIndex.toString(),
    })
    if (isPremium) params.set('premium', '1')
    return `/player?${params.toString()}`
  }

  const progress =
    item.duration > 0 ? (item.playbackPosition / item.duration) * 100 : 0
  const episodeText =
    item.episodes && item.episodes.length > 0
      ? item.episodes[item.episodeIndex]?.name || `第${item.episodeIndex + 1}集`
      : ''

  return (
    <MediaItemCard
      href={getVideoUrl()}
      poster={item.poster}
      title={item.title}
      subtitle={episodeText}
      metaLeft={`${formatTime(item.playbackPosition)} / ${formatTime(item.duration)}`}
      progress={progress}
      actions={
        <>
          <FavoriteButton
            videoId={item.videoId}
            source={item.source}
            title={item.title}
            poster={item.poster}
            remarks={episodeText}
            size={14}
            showTooltip={false}
            isPremium={isPremium}
            plain
          />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="删除"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
          >
            <TrashIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </>
      }
    />
  )
}

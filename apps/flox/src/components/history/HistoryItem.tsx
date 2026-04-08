/**
 * HistoryItem - Individual watch history item
 * Displays video thumbnail, title, episode, progress, and delete button
 */

import { TrashIcon } from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import type { VideoHistoryItem } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/utils/format-utils'
import { PosterImage } from './PosterImage'

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
    if (isPremium) {
      params.set('premium', '1')
    }
    return `/player?${params.toString()}`
  }

  const handleClick = (event: React.MouseEvent) => {
    // Middle mouse or Ctrl/Cmd+click opens in new tab
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      event.preventDefault()
      window.open(getVideoUrl(), '_blank')
      return
    }
  }

  const progress = (item.playbackPosition / item.duration) * 100
  const episodeText =
    item.episodes && item.episodes.length > 0
      ? item.episodes[item.episodeIndex]?.name || `第${item.episodeIndex + 1}集`
      : ''

  return (
    <div className="group bg-background/50 rounded-2xl p-3 hover:bg-primary/10 transition-all border border-transparent hover:border-border">
      <a
        href={getVideoUrl()}
        onClick={(e) => {
          e.preventDefault()
          handleClick(e as any)
          if (!e.ctrlKey && !e.metaKey) {
            window.location.href = getVideoUrl()
          }
        }}
        onAuxClick={(e) => handleClick(e as any)}
        className="block"
      >
        <div className="flex gap-3">
          {/* Poster */}
          <PosterImage
            poster={item.poster}
            title={item.title}
            progress={progress}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors mb-1">
              {item.title}
            </h3>
            {episodeText && (
              <p className="text-xs text-muted-foreground mb-1">
                {episodeText}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatTime(item.playbackPosition)} /{' '}
                {formatTime(item.duration)}
              </span>
              <span>{formatDate(item.timestamp)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 self-start opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Favorite button */}
            <FavoriteButton
              videoId={item.videoId}
              source={item.source}
              title={item.title}
              poster={item.poster}
              remarks={episodeText}
              size={14}
              className="!p-1.5 !bg-transparent !border-0 !shadow-none hover:bg-background/95"
              showTooltip={false}
              isPremium={isPremium}
            />

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
              className="p-1.5 hover:bg-background/95 rounded-full cursor-pointer"
              aria-label="删除"
            >
              <TrashIcon
                size={14}
                className="text-muted-foreground"
              />
            </button>
          </div>
        </div>
      </a>
    </div>
  )
}

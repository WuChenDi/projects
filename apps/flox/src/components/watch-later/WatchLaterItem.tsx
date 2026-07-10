import { Button } from '@cdlab/ui/components/button'
import { TrashIcon } from 'lucide-react'
import { MediaItemCard } from '@/components/ui/MediaItemCard'
import type { WatchLaterItem as WatchLaterItemType } from '@/lib/types'

interface WatchLaterItemProps {
  item: WatchLaterItemType
  onRemove: () => void
  isPremium?: boolean
}

export function WatchLaterItem({
  item,
  onRemove,
  isPremium = false,
}: WatchLaterItemProps) {
  const getVideoUrl = (): string => {
    const params = new URLSearchParams({
      id: item.videoId.toString(),
      source: item.source,
      title: item.title,
    })
    if (isPremium) params.set('premium', '1')
    return `/player?${params.toString()}`
  }

  return (
    <MediaItemCard
      href={getVideoUrl()}
      poster={item.poster}
      title={item.title}
      subtitle={item.year}
      metaLeft={item.remarks}
      actions={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="从稍后观看移除"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
        >
          <TrashIcon className="size-3.5 text-muted-foreground" />
        </Button>
      }
    />
  )
}

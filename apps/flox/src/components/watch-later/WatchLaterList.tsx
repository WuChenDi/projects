import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { InboxIcon } from 'lucide-react'
import type { WatchLaterItem as WatchLaterItemType } from '@/lib/types'
import { WatchLaterItem } from './WatchLaterItem'

interface WatchLaterListProps {
  items: WatchLaterItemType[]
  onRemove: (videoId: string | number, source: string) => void
  isPremium?: boolean
}

export function WatchLaterList({
  items,
  onRemove,
  isPremium = false,
}: WatchLaterListProps) {
  if (items.length === 0) {
    return (
      <IKEmpty
        icon={InboxIcon}
        title="暂无稍后观看"
        hint="点击视频上的书签按钮即可加入"
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 scroll-smooth">
      {items.map((item) => (
        <WatchLaterItem
          key={`${item.source}:${item.videoId}`}
          item={item}
          onRemove={() => onRemove(item.videoId, item.source)}
          isPremium={isPremium}
        />
      ))}
    </div>
  )
}

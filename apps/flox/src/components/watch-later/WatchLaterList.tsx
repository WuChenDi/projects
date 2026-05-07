import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { InboxIcon } from 'lucide-react'
import type { WatchLaterItem as WatchLaterItemType } from '@/lib/types'
import { groupByDate } from '@/lib/utils/format-utils'
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

  const groups = groupByDate(items, (item) => item.addedAt)

  return (
    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-4 scroll-smooth">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <WatchLaterItem
                key={`${item.source}:${item.videoId}`}
                item={item}
                onRemove={() => onRemove(item.videoId, item.source)}
                isPremium={isPremium}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

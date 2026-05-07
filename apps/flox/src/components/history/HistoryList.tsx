import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { InboxIcon } from 'lucide-react'
import type { VideoHistoryItem } from '@/lib/types'
import { groupByDate } from '@/lib/utils/format-utils'
import { HistoryItem } from './HistoryItem'

interface HistoryListProps {
  history: VideoHistoryItem[]
  onRemove: (videoId: string | number, source: string) => void
  isPremium?: boolean
}

export function HistoryList({
  history,
  onRemove,
  isPremium = false,
}: HistoryListProps) {
  if (history.length === 0) {
    return (
      <IKEmpty
        icon={InboxIcon}
        title="暂无观看历史"
        hint="您观看的视频会自动记录在这里"
      />
    )
  }

  const groups = groupByDate(history, (item) => item.timestamp)

  return (
    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <HistoryItem
                key={`${item.videoId}-${item.source}-${item.timestamp}`}
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

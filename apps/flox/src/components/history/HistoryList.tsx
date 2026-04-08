import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { InboxIcon } from 'lucide-react'
import type { VideoHistoryItem } from '@/lib/types'
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
  return (
    <div
      className="flex-1 overflow-y-auto -mx-2 px-2"
      style={{
        transform: 'translate3d(0, 0, 0)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {history.length === 0 ? (
        <IKEmpty icon={InboxIcon} title="暂无观看历史" hint="您观看的视频会自动记录在这里" />
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <HistoryItem
              key={`${item.videoId}-${item.source}-${item.timestamp}`}
              item={item}
              onRemove={() => onRemove(item.videoId, item.source)}
              isPremium={isPremium}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import type { VideoHistoryItem } from '@/lib/types'
import { HistoryEmptyState } from './HistoryEmptyState'
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
        <HistoryEmptyState />
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

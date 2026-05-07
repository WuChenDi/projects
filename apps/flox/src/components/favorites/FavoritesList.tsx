import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { InboxIcon } from 'lucide-react'
import type { FavoriteItem } from '@/lib/types'
import { groupByDate } from '@/lib/utils/format-utils'
import { FavoritesItem } from './FavoritesItem'

interface FavoritesListProps {
  favorites: FavoriteItem[]
  onRemove: (videoId: string | number, source: string) => void
  isPremium?: boolean
}

export function FavoritesList({
  favorites,
  onRemove,
  isPremium = false,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <IKEmpty
        icon={InboxIcon}
        title="暂无收藏"
        hint="点击视频上的心形按钮即可收藏"
      />
    )
  }

  const groups = groupByDate(favorites, (item) => item.addedAt)

  return (
    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-4 scroll-smooth">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <FavoritesItem
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

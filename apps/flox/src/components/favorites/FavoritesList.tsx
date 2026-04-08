/**
 * FavoritesList - Scrollable list of favorite items
 */

import type { FavoriteItem } from '@/lib/types'
import { FavoritesEmptyState } from './FavoritesEmptyState'
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
    return <FavoritesEmptyState />
  }

  return (
    <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 scroll-smooth">
      {favorites.map((item) => (
        <FavoritesItem
          key={`${item.source}:${item.videoId}`}
          item={item}
          onRemove={() => onRemove(item.videoId, item.source)}
          isPremium={isPremium}
        />
      ))}
    </div>
  )
}

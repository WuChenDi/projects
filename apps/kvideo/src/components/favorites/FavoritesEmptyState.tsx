/**
 * FavoritesEmptyState - Empty state component for favorites sidebar
 * Matches HistoryEmptyState design for consistency
 */

import { InboxIcon } from 'lucide-react'

export function FavoritesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <InboxIcon
        size={64}
        className="text-[var(--text-color-secondary)] opacity-50 mb-4"
      />
      <p className="text-[var(--text-color-secondary)] text-lg">暂无收藏</p>
      <p className="text-[var(--text-color-secondary)] text-sm mt-2 opacity-70">
        点击视频上的心形按钮即可收藏
      </p>
    </div>
  )
}

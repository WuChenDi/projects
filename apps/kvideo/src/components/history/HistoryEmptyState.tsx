/**
 * HistoryEmptyState - Empty state for watch history
 * Displays when no viewing history exists
 */

import { InboxIcon } from 'lucide-react'

export function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <InboxIcon
        size={64}
        className="text-[var(--text-color-secondary)] opacity-50 mb-4"
      />
      <p className="text-[var(--text-color-secondary)] text-lg">暂无观看历史</p>
      <p className="text-[var(--text-color-secondary)] text-sm mt-2 opacity-70">
        您观看的视频会自动记录在这里
      </p>
    </div>
  )
}

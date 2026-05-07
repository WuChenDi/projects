/**
 * Formatting utilities for time and dates
 */

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Group an array of items by day label, preserving existing order.
 */
export function groupByDate<T>(
  items: T[],
  getTimestamp: (item: T) => number,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []
  const seen = new Map<string, T[]>()

  for (const item of items) {
    const label = formatDate(getTimestamp(item))
    if (!seen.has(label)) {
      const bucket: T[] = []
      seen.set(label, bucket)
      groups.push({ label, items: bucket })
    }
    seen.get(label)!.push(item)
  }

  return groups
}

/**
 * Format timestamp to relative date (今天, 昨天, X天前, or date)
 */
export function formatDate(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

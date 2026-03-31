const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes({
  bytes,
  decimals = 1,
}: {
  bytes: number
  decimals?: number
}): string {
  if (bytes <= 0) return '0 B'

  const k = 1024
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    SIZE_UNITS.length - 1,
  )
  const value = bytes / k ** unitIndex

  return `${value.toFixed(decimals)} ${SIZE_UNITS[unitIndex]}`
}

/**
 * @deprecated Use `formatBytes` instead
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

import { exportAllStores, importAllStores } from './registry'

export const sortOptions = {
  default: '默认排序',
  relevance: '按相关性',
  'latency-asc': '延迟低到高',
  'date-desc': '发布时间（新到旧）',
  'date-asc': '发布时间（旧到新）',
  'rating-desc': '按评分（高到低）',
  'name-asc': '按名称（A-Z）',
  'name-desc': '按名称（Z-A）',
} as const

const HISTORY_KEYS = ['flox:history', 'flox:history:premium']
const SEARCH_HISTORY_KEYS = [
  'flox:search-history',
  'flox:search-history:premium',
]

export interface ExportOptions {
  includeSearchHistory?: boolean
  includeHistory?: boolean
}

const EXPORT_VERSION = 2

/**
 * Serialize every persisted store to a JSON backup string.
 * History/search-history can be excluded via flags.
 */
export function exportSettings(opts: ExportOptions = {}): string {
  const stores = exportAllStores()

  if (!opts.includeSearchHistory) {
    for (const k of SEARCH_HISTORY_KEYS) delete stores[k]
  }
  if (!opts.includeHistory) {
    for (const k of HISTORY_KEYS) delete stores[k]
  }

  return JSON.stringify({ version: EXPORT_VERSION, stores }, null, 2)
}

/**
 * Restore stores from a backup string produced by `exportSettings`.
 * Returns true on success, false if the payload is not a recognized backup.
 */
export function importSettings(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString)
    if (
      data &&
      typeof data === 'object' &&
      data.stores &&
      typeof data.stores === 'object'
    ) {
      importAllStores(data.stores as Record<string, unknown>)
      return true
    }
  } catch {
    // fall through
  }
  return false
}

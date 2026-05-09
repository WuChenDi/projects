/**
 * Central registry of every persisted store in the app.
 *
 * Each persisted store registers itself once at module load (via
 * `createPersistedStore`). The registry is then the single source of
 * truth for "全局重置 / 导出 / 导入" operations — adding a new store
 * only requires creating it through the factory.
 */

import { clearAllCache } from '@/lib/utils/cacheManager'

export interface StoreEntry {
  key: string
  reset: () => void
  serialize: () => unknown
  hydrate: (data: unknown) => void
}

const registry = new Map<string, StoreEntry>()

export function registerStore(entry: StoreEntry): void {
  registry.set(entry.key, entry)
}

export function getRegistry(): readonly StoreEntry[] {
  return Array.from(registry.values())
}

export function resetAllStores(): void {
  for (const entry of registry.values()) entry.reset()
}

export function exportAllStores(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const entry of registry.values()) out[entry.key] = entry.serialize()
  return out
}

export function importAllStores(data: Record<string, unknown>): void {
  for (const entry of registry.values()) {
    if (entry.key in data) entry.hydrate(data[entry.key])
  }
}

/**
 * Clear all browser caches that the app owns:
 * - Video segment cache (`video-cache-v1`) + its localStorage metadata index
 * - Any other Cache Storage entries (e.g. SW caches)
 */
export async function clearAppCaches(): Promise<void> {
  if (typeof window === 'undefined') return

  // Clears video-cache-v1 entries AND wipes the cache-metadata localStorage
  // index, keeping the two stores consistent.
  await clearAllCache()

  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.map((n) => caches.delete(n)))
  }
}

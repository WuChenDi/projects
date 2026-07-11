import { decodeAudioDuration } from '@/editor/lib/audio'
import { mediaPool } from '@/editor/lib/media-pool'
import type { MediaAsset } from '@/editor/types'
import { genid } from '@/lib/genid'

// Owns the in-memory media pool and mirrors each blob into IndexedDB so
// FEAT-027 can restore a project. Adapted from bycut's media-manager
// (storageService replaced by the createIDBStore-backed mediaPool).

export class MediaManager {
  private assets: MediaAsset[] = []
  private listeners = new Set<() => void>()

  getAssets(): MediaAsset[] {
    return this.assets
  }

  getAsset({ id }: { id: string }): MediaAsset | null {
    return this.assets.find((asset) => asset.id === id) ?? null
  }

  /**
   * Decodes the blob's duration, registers it as a media asset and persists
   * the bytes to the pool. `mediaId` lets callers reuse a stable key (e.g. a
   * history item id) so the same source is not stored twice.
   */
  async addAsset({
    file,
    name,
    mediaId,
  }: {
    file: File
    name: string
    mediaId?: string
  }): Promise<MediaAsset> {
    const id = mediaId ?? String(genid.nextId())

    const existing = this.getAsset({ id })
    if (existing) return existing

    const duration = await decodeAudioDuration({ file })
    const asset: MediaAsset = { id, name, file, duration }

    this.assets = [...this.assets, asset]
    this.notify()

    try {
      await mediaPool.set(id, await file.arrayBuffer())
    } catch (error) {
      console.error('Failed to persist media asset:', error)
    }

    return asset
  }

  /**
   * Registers an asset whose bytes are already in the media pool (autosave
   * restore). Skips the decode + persist that `addAsset` does — the duration
   * comes from the saved snapshot and the blob is read back from IndexedDB.
   */
  hydrateAsset({
    id,
    name,
    file,
    duration,
  }: {
    id: string
    name: string
    file: File
    duration: number
  }): MediaAsset {
    const existing = this.getAsset({ id })
    if (existing) return existing

    const asset: MediaAsset = { id, name, file, duration }
    this.assets = [...this.assets, asset]
    this.notify()
    return asset
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

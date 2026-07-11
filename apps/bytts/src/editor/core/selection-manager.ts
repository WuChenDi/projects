import type { ClipRef } from '@/editor/types'

// Tracks which clips are selected. Ported from bycut; wired to the FEAT-027
// interactions (click, multi-select, box select, batch drag).

export class SelectionManager {
  private selected: ClipRef[] = []
  private listeners = new Set<() => void>()

  getSelected(): ClipRef[] {
    return this.selected
  }

  isSelected({ trackId, clipId }: ClipRef): boolean {
    return this.selected.some(
      (ref) => ref.trackId === trackId && ref.clipId === clipId,
    )
  }

  setSelected({ clips }: { clips: ClipRef[] }): void {
    this.selected = clips
    this.notify()
  }

  toggle({ trackId, clipId }: ClipRef): void {
    if (this.isSelected({ trackId, clipId })) {
      this.selected = this.selected.filter(
        (ref) => !(ref.trackId === trackId && ref.clipId === clipId),
      )
    } else {
      this.selected = [...this.selected, { trackId, clipId }]
    }
    this.notify()
  }

  clear(): void {
    if (this.selected.length === 0) return
    this.selected = []
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

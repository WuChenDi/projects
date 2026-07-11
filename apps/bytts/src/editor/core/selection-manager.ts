// Tracks which clips are selected. Ported from bycut; interactions land in
// FEAT-027. Kept minimal here so the timeline can highlight a clicked clip.

interface ClipRef {
  trackId: string
  clipId: string
}

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

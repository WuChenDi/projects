import type { AudioClip, AudioTrack } from '@/editor/types'
import { genid } from '@/lib/genid'

// Holds the audio tracks directly (no scenes layer). Ported from bycut's
// timeline-manager, trimmed to the audio operations FEAT-026 needs; the
// command-driven mutations (move/trim/split/…) arrive in FEAT-027.

export class TimelineManager {
  private tracks: AudioTrack[] = []
  private listeners = new Set<() => void>()

  getTracks(): AudioTrack[] {
    return this.tracks
  }

  getTrackById({ trackId }: { trackId: string }): AudioTrack | null {
    return this.tracks.find((track) => track.id === trackId) ?? null
  }

  getTotalDuration(): number {
    if (this.tracks.length === 0) return 0
    const ends = this.tracks.map((track) =>
      track.clips.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0,
      ),
    )
    return Math.max(...ends, 0)
  }

  /** End time of the last clip on a track (0 when empty). */
  private getTrackEnd({ track }: { track: AudioTrack }): number {
    return track.clips.reduce(
      (max, clip) => Math.max(max, clip.startTime + clip.duration),
      0,
    )
  }

  addTrack({ name }: { name?: string } = {}): AudioTrack {
    const track: AudioTrack = {
      id: String(genid.nextId()),
      name: name ?? `音轨 ${this.tracks.length + 1}`,
      muted: false,
      clips: [],
    }
    this.tracks = [...this.tracks, track]
    this.notify()
    return track
  }

  /**
   * Appends a clip built from a media asset onto a track. When no track is
   * given the least-filled track is picked (or a new one is created) so
   * sequential sends spread across tracks instead of piling onto one.
   */
  addClipFromMedia({
    mediaId,
    name,
    duration,
    trackId,
  }: {
    mediaId: string
    name: string
    duration: number
    trackId?: string
  }): AudioClip {
    const track = trackId
      ? this.getTrackById({ trackId })
      : this.pickTrackForNewClip()
    const targetTrack = track ?? this.addTrack()

    const clip: AudioClip = {
      id: String(genid.nextId()),
      name,
      mediaId,
      startTime: this.getTrackEnd({ track: targetTrack }),
      duration,
      trimStart: 0,
      trimEnd: 0,
      volume: 1,
      muted: false,
    }

    this.tracks = this.tracks.map((current) =>
      current.id === targetTrack.id
        ? { ...current, clips: [...current.clips, clip] }
        : current,
    )
    this.notify()
    return clip
  }

  private pickTrackForNewClip(): AudioTrack | null {
    if (this.tracks.length === 0) return null
    return this.tracks.reduce((least, track) =>
      this.getTrackEnd({ track }) < this.getTrackEnd({ track: least })
        ? track
        : least,
    )
  }

  toggleTrackMute({ trackId }: { trackId: string }): void {
    this.tracks = this.tracks.map((track) =>
      track.id === trackId ? { ...track, muted: !track.muted } : track,
    )
    this.notify()
  }

  setTracks({ tracks }: { tracks: AudioTrack[] }): void {
    this.tracks = tracks
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

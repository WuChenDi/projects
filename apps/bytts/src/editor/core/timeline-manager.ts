import { EditorCore } from '@/editor/core'
import type { Command } from '@/editor/core/commands'
import type { ClipboardClip } from '@/editor/core/timeline-commands'
import {
  AddClipFromMediaCommand,
  AddTrackCommand,
  BatchMoveClipsCommand,
  DeleteClipsCommand,
  DuplicateClipsCommand,
  MoveClipCommand,
  PasteClipsCommand,
  RemoveSilenceCommand,
  RemoveTrackCommand,
  ReorderTracksCommand,
  SetTrackFlagsCommand,
  SplitClipsCommand,
  UpdateClipAudioCommand,
  UpdateClipTrimCommand,
} from '@/editor/core/timeline-commands'
import type { AudioSilenceRange } from '@/editor/lib/audio-silence'
import type { AudioClip, AudioTrack, ClipRef } from '@/editor/types'
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
      solo: false,
      clips: [],
    }
    this.tracks = [...this.tracks, track]
    this.notify()
    return track
  }

  setTracks({ tracks }: { tracks: AudioTrack[] }): void {
    this.tracks = tracks
    this.notify()
  }

  // --- command-driven mutations (routed through the undo/redo bus) ---------

  private run<T extends Command>(command: T): T {
    EditorCore.getInstance().command.execute({ command })
    return command
  }

  addTrackWithHistory(): string {
    return this.run(new AddTrackCommand()).getTrackId()
  }

  addClipFromMediaWithHistory(args: {
    mediaId: string
    name: string
    duration: number
    trackId?: string
  }): string {
    return this.run(new AddClipFromMediaCommand(args)).getClipId()!
  }

  removeTrack({ trackId }: { trackId: string }): void {
    this.run(new RemoveTrackCommand(trackId))
  }

  reorderTracks({ trackIds }: { trackIds: string[] }): void {
    this.run(new ReorderTracksCommand(trackIds))
  }

  splitClips({
    clips,
    splitTime,
    retainSide = 'both',
  }: {
    clips: ClipRef[]
    splitTime: number
    retainSide?: 'both' | 'left' | 'right'
  }): ClipRef[] {
    return this.run(
      new SplitClipsCommand(clips, splitTime, retainSide),
    ).getRightSideClips()
  }

  updateClipTrim({
    clipId,
    trimStart,
    trimEnd,
    startTime,
    duration,
  }: {
    clipId: string
    trimStart: number
    trimEnd: number
    startTime?: number
    duration?: number
  }): void {
    this.run(
      new UpdateClipTrimCommand(
        clipId,
        trimStart,
        trimEnd,
        startTime,
        duration,
      ),
    )
  }

  moveClipsByDelta({
    clips,
    timeDelta,
  }: {
    clips: ClipRef[]
    timeDelta: number
  }): void {
    this.run(new BatchMoveClipsCommand(clips, timeDelta))
  }

  moveClip({
    sourceTrackId,
    targetTrackId,
    clipId,
    newStartTime,
  }: {
    sourceTrackId: string
    targetTrackId: string
    clipId: string
    newStartTime: number
  }): void {
    this.run(
      new MoveClipCommand(sourceTrackId, targetTrackId, clipId, newStartTime),
    )
  }

  deleteClips({ clips }: { clips: ClipRef[] }): void {
    this.run(new DeleteClipsCommand(clips))
  }

  updateClipAudio({
    clipId,
    patch,
  }: {
    clipId: string
    patch: Partial<Pick<AudioClip, 'gainDb' | 'fadeIn' | 'fadeOut' | 'muted'>>
  }): void {
    this.run(new UpdateClipAudioCommand(clipId, patch))
  }

  toggleTrackMute({ trackId }: { trackId: string }): void {
    const track = this.getTrackById({ trackId })
    if (!track) return
    this.run(new SetTrackFlagsCommand(trackId, { muted: !track.muted }))
  }

  toggleTrackSolo({ trackId }: { trackId: string }): void {
    const track = this.getTrackById({ trackId })
    if (!track) return
    this.run(new SetTrackFlagsCommand(trackId, { solo: !track.solo }))
  }

  removeSilence({
    trackId,
    clipId,
    ranges,
  }: {
    trackId: string
    clipId: string
    ranges: AudioSilenceRange[]
  }): void {
    this.run(new RemoveSilenceCommand(trackId, clipId, ranges))
  }

  duplicateClips({ clips }: { clips: ClipRef[] }): ClipRef[] {
    return this.run(new DuplicateClipsCommand(clips)).getDuplicatedClips()
  }

  pasteClips({
    time,
    items,
  }: {
    time: number
    items: ClipboardClip[]
  }): ClipRef[] {
    return this.run(new PasteClipsCommand(time, items)).getPastedClips()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

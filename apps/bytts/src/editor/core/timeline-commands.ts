import { EditorCore } from '@/editor/core'
import type { Command } from '@/editor/core/commands'
import type { AudioSilenceRange } from '@/editor/lib/audio-silence'
import type { AudioClip, AudioTrack, ClipRef } from '@/editor/types'
import { genid } from '@/lib/genid'

// Snapshot-based timeline commands. Ported from bycut's element/track command
// set, trimmed to the audio model: each command captures the full track array
// (and selection) before mutating, so undo just restores that snapshot and one
// Ctrl+Z reverts one logical action. Split/trim/move arithmetic is kept
// identical to bycut so behavior matches the reference editor.

abstract class SnapshotCommand implements Command {
  protected savedTracks: AudioTrack[] | null = null
  protected savedSelection: ClipRef[] = []
  // Cache generated ids so redo() (which re-runs execute over the identical
  // restored snapshot, requesting the same ids in the same order) reuses them
  // instead of minting new ones — keeping ClipRef/selection valid across redo.
  private idPool: string[] = []
  private idCursor = 0

  abstract execute(): boolean

  redo(): void {
    this.execute()
  }

  undo(): void {
    if (!this.savedTracks) return
    const editor = EditorCore.getInstance()
    editor.timeline.setTracks({ tracks: this.savedTracks })
    editor.selection.setSelected({ clips: this.savedSelection })
  }

  protected snapshot(editor: EditorCore): void {
    this.savedTracks = editor.timeline.getTracks()
    this.savedSelection = editor.selection.getSelected()
  }

  protected resetIds(): void {
    this.idCursor = 0
  }

  protected freshId(): string {
    if (this.idCursor < this.idPool.length) return this.idPool[this.idCursor++]
    const id = String(genid.nextId())
    this.idPool.push(id)
    this.idCursor++
    return id
  }
}

// --- split ---------------------------------------------------------------

export class SplitClipsCommand extends SnapshotCommand {
  private rightSideClips: ClipRef[] = []

  constructor(
    private clips: ClipRef[],
    private splitTime: number,
    private retainSide: 'both' | 'left' | 'right' = 'both',
  ) {
    super()
  }

  getRightSideClips(): ClipRef[] {
    return this.rightSideClips
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    this.resetIds()
    this.rightSideClips = []

    let didSplit = false
    const updatedTracks = (this.savedTracks ?? []).map((track) => {
      const clipsToSplit = this.clips.filter((ref) => ref.trackId === track.id)
      if (clipsToSplit.length === 0) return track

      return {
        ...track,
        clips: track.clips.flatMap((clip) => {
          const shouldSplit = clipsToSplit.some((ref) => ref.clipId === clip.id)
          if (!shouldSplit) return [clip]

          const effectiveStart = clip.startTime
          const effectiveEnd = clip.startTime + clip.duration
          if (
            this.splitTime <= effectiveStart ||
            this.splitTime >= effectiveEnd
          ) {
            return [clip]
          }

          didSplit = true
          const relativeTime = this.splitTime - clip.startTime
          const leftVisibleDuration = relativeTime
          const rightVisibleDuration = clip.duration - relativeTime

          if (this.retainSide === 'left') {
            return [
              {
                ...clip,
                duration: leftVisibleDuration,
                trimEnd: clip.trimEnd + rightVisibleDuration,
              },
            ]
          }

          if (this.retainSide === 'right') {
            const newId = this.freshId()
            this.rightSideClips.push({ trackId: track.id, clipId: newId })
            return [
              {
                ...clip,
                id: newId,
                startTime: this.splitTime,
                duration: rightVisibleDuration,
                trimStart: clip.trimStart + leftVisibleDuration,
              },
            ]
          }

          const secondClipId = this.freshId()
          this.rightSideClips.push({ trackId: track.id, clipId: secondClipId })
          return [
            {
              ...clip,
              duration: leftVisibleDuration,
              trimEnd: clip.trimEnd + rightVisibleDuration,
            },
            {
              ...clip,
              id: secondClipId,
              startTime: this.splitTime,
              duration: rightVisibleDuration,
              trimStart: clip.trimStart + leftVisibleDuration,
            },
          ]
        }),
      }
    })

    if (!didSplit) return false

    editor.timeline.setTracks({ tracks: updatedTracks })
    if (this.rightSideClips.length > 0) {
      editor.selection.setSelected({ clips: this.rightSideClips })
    }
    return true
  }
}

// --- trim ----------------------------------------------------------------

export class UpdateClipTrimCommand extends SnapshotCommand {
  constructor(
    private clipId: string,
    private trimStart: number,
    private trimEnd: number,
    private startTime?: number,
    private duration?: number,
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const tracks = this.savedTracks ?? []
    const current = tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.id === this.clipId)
    if (!current) return false

    const nextStartTime = this.startTime ?? current.startTime
    const nextDuration = this.duration ?? current.duration
    if (
      current.trimStart === this.trimStart &&
      current.trimEnd === this.trimEnd &&
      current.startTime === nextStartTime &&
      current.duration === nextDuration
    ) {
      return false
    }

    const updatedTracks = tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === this.clipId
          ? {
              ...clip,
              trimStart: this.trimStart,
              trimEnd: this.trimEnd,
              startTime: nextStartTime,
              duration: nextDuration,
            }
          : clip,
      ),
    }))

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

// --- clip audio (gain / fades / mute) ------------------------------------

export class UpdateClipAudioCommand extends SnapshotCommand {
  constructor(
    private clipId: string,
    private patch: Partial<
      Pick<AudioClip, 'gainDb' | 'fadeIn' | 'fadeOut' | 'muted'>
    >,
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const tracks = this.savedTracks ?? []
    const current = tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.id === this.clipId)
    if (!current) return false

    const keys = Object.keys(this.patch) as Array<keyof typeof this.patch>
    if (keys.every((key) => current[key] === this.patch[key])) return false

    const updatedTracks = tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === this.clipId ? { ...clip, ...this.patch } : clip,
      ),
    }))

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

// --- track flags (mute / solo) -------------------------------------------

export class SetTrackFlagsCommand extends SnapshotCommand {
  constructor(
    private trackId: string,
    private patch: Partial<Pick<AudioTrack, 'muted' | 'solo'>>,
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const tracks = this.savedTracks ?? []
    const current = tracks.find((track) => track.id === this.trackId)
    if (!current) return false

    const keys = Object.keys(this.patch) as Array<keyof typeof this.patch>
    if (keys.every((key) => current[key] === this.patch[key])) return false

    const updatedTracks = tracks.map((track) =>
      track.id === this.trackId ? { ...track, ...this.patch } : track,
    )

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

// --- silence removal (split + delete + ripple, one undo step) -------------

export class RemoveSilenceCommand extends SnapshotCommand {
  constructor(
    private trackId: string,
    private clipId: string,
    private ranges: AudioSilenceRange[],
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    this.resetIds()

    const tracks = this.savedTracks ?? []
    const track = tracks.find((current) => current.id === this.trackId)
    const clip = track?.clips.find((current) => current.id === this.clipId)
    if (!track || !clip) return false

    // Silent ranges are clip-relative (0..duration). Merge/clamp them, then
    // build the audible complement as packed sub-clips and ripple every later
    // clip on the track left by the total removed duration.
    const sortedRanges = this.ranges
      .map((range) => ({
        start: Math.max(0, Math.min(clip.duration, range.start)),
        end: Math.max(0, Math.min(clip.duration, range.end)),
      }))
      .filter((range) => range.end > range.start)
      .sort((left, right) => left.start - right.start)

    const mergedRanges: AudioSilenceRange[] = []
    for (const range of sortedRanges) {
      const last = mergedRanges[mergedRanges.length - 1]
      if (last && range.start <= last.end) {
        last.end = Math.max(last.end, range.end)
      } else {
        mergedRanges.push({ ...range })
      }
    }

    if (mergedRanges.length === 0) return false

    // Audible segments = complement of the silent ranges within [0, duration].
    const audibleSegments: Array<{ from: number; to: number }> = []
    let cursor = 0
    for (const range of mergedRanges) {
      if (range.start > cursor) {
        audibleSegments.push({ from: cursor, to: range.start })
      }
      cursor = range.end
    }
    if (cursor < clip.duration) {
      audibleSegments.push({ from: cursor, to: clip.duration })
    }

    const totalRemoved = mergedRanges.reduce(
      (sum, range) => sum + (range.end - range.start),
      0,
    )
    const originalEnd = clip.startTime + clip.duration

    // Pack the audible segments consecutively from the clip's original start.
    const packedClips: AudioClip[] = []
    let packedStart = clip.startTime
    audibleSegments.forEach((segment, index) => {
      const segmentDuration = segment.to - segment.from
      if (segmentDuration <= 0) return
      packedClips.push({
        ...clip,
        // Keep the original id on the first surviving segment so selection and
        // any external reference stay valid; give the rest fresh ids.
        id: index === 0 ? clip.id : this.freshId(),
        startTime: packedStart,
        duration: segmentDuration,
        trimStart: clip.trimStart + segment.from,
        trimEnd: clip.trimEnd + (clip.duration - segment.to),
        fadeIn: index === 0 ? clip.fadeIn : 0,
        fadeOut: index === audibleSegments.length - 1 ? clip.fadeOut : 0,
      })
      packedStart += segmentDuration
    })

    const updatedTracks = tracks.map((current) => {
      if (current.id !== this.trackId) return current
      return {
        ...current,
        clips: current.clips.flatMap((existing) => {
          if (existing.id === this.clipId) return packedClips
          // Ripple: pull clips that started at/after the edited clip's end left.
          if (existing.startTime >= originalEnd - 1e-6) {
            return [
              {
                ...existing,
                startTime: Math.max(0, existing.startTime - totalRemoved),
              },
            ]
          }
          return [existing]
        }),
      }
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    editor.selection.setSelected({
      clips: packedClips.map((packed) => ({
        trackId: this.trackId,
        clipId: packed.id,
      })),
    })
    return true
  }
}

// --- move ----------------------------------------------------------------

export class BatchMoveClipsCommand extends SnapshotCommand {
  constructor(
    private clips: ClipRef[],
    private timeDelta: number,
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const clipKeys = new Set(
      this.clips.map(({ trackId, clipId }) => `${trackId}:${clipId}`),
    )

    const updatedTracks = (this.savedTracks ?? []).map((track) => {
      if (!this.clips.some((ref) => ref.trackId === track.id)) return track
      return {
        ...track,
        clips: track.clips.map((clip) =>
          clipKeys.has(`${track.id}:${clip.id}`)
            ? {
                ...clip,
                startTime: Math.max(0, clip.startTime + this.timeDelta),
              }
            : clip,
        ),
      }
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

export class MoveClipCommand extends SnapshotCommand {
  constructor(
    private sourceTrackId: string,
    private targetTrackId: string,
    private clipId: string,
    private newStartTime: number,
  ) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const tracks = this.savedTracks ?? []
    const sourceTrack = tracks.find((track) => track.id === this.sourceTrackId)
    const clip = sourceTrack?.clips.find(
      (current) => current.id === this.clipId,
    )
    if (!sourceTrack || !clip) return false

    const movedClip: AudioClip = {
      ...clip,
      startTime: Math.max(0, this.newStartTime),
    }
    const isSameTrack = this.sourceTrackId === this.targetTrackId

    const updatedTracks = tracks.map((track) => {
      if (isSameTrack && track.id === this.sourceTrackId) {
        return {
          ...track,
          clips: track.clips.map((current) =>
            current.id === this.clipId ? movedClip : current,
          ),
        }
      }
      if (track.id === this.sourceTrackId) {
        return {
          ...track,
          clips: track.clips.filter((current) => current.id !== this.clipId),
        }
      }
      if (track.id === this.targetTrackId) {
        return { ...track, clips: [...track.clips, movedClip] }
      }
      return track
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

// --- delete --------------------------------------------------------------

export class DeleteClipsCommand extends SnapshotCommand {
  constructor(private clips: ClipRef[]) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)

    const updatedTracks = (this.savedTracks ?? []).map((track) => {
      if (!this.clips.some((ref) => ref.trackId === track.id)) return track
      return {
        ...track,
        clips: track.clips.filter(
          (clip) =>
            !this.clips.some(
              (ref) => ref.trackId === track.id && ref.clipId === clip.id,
            ),
        ),
      }
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    editor.selection.setSelected({ clips: [] })
    return true
  }
}

// --- duplicate -----------------------------------------------------------

export class DuplicateClipsCommand extends SnapshotCommand {
  private duplicated: ClipRef[] = []

  constructor(private clips: ClipRef[]) {
    super()
  }

  getDuplicatedClips(): ClipRef[] {
    return this.duplicated
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    this.resetIds()
    this.duplicated = []

    const updatedTracks = (this.savedTracks ?? []).map((track) => {
      const clipsToCopy = track.clips.filter((clip) =>
        this.clips.some(
          (ref) => ref.trackId === track.id && ref.clipId === clip.id,
        ),
      )
      if (clipsToCopy.length === 0) return track

      const copies = clipsToCopy.map((clip) => {
        const newId = this.freshId()
        this.duplicated.push({ trackId: track.id, clipId: newId })
        return {
          ...clip,
          id: newId,
          startTime: clip.startTime + clip.duration,
          name: `${clip.name} 副本`,
        }
      })

      return { ...track, clips: [...track.clips, ...copies] }
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    if (this.duplicated.length > 0) {
      editor.selection.setSelected({ clips: this.duplicated })
    }
    return true
  }
}

// --- paste ---------------------------------------------------------------

export interface ClipboardClip {
  trackId: string
  clip: Omit<AudioClip, 'id'>
}

export class PasteClipsCommand extends SnapshotCommand {
  private pasted: ClipRef[] = []

  constructor(
    private time: number,
    private items: ClipboardClip[],
  ) {
    super()
  }

  getPastedClips(): ClipRef[] {
    return this.pasted
  }

  execute(): boolean {
    if (this.items.length === 0) return false
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    this.resetIds()
    this.pasted = []

    const tracks = this.savedTracks ?? []
    const fallbackTrackId = tracks[0]?.id
    if (!fallbackTrackId) return false

    const minStart = Math.min(...this.items.map((item) => item.clip.startTime))
    const additions = new Map<string, AudioClip[]>()

    for (const item of this.items) {
      const targetTrackId = tracks.some((track) => track.id === item.trackId)
        ? item.trackId
        : fallbackTrackId
      const relativeOffset = item.clip.startTime - minStart
      const newClip: AudioClip = {
        ...item.clip,
        id: this.freshId(),
        startTime: Math.max(0, this.time + relativeOffset),
      }
      const bucket = additions.get(targetTrackId) ?? []
      bucket.push(newClip)
      additions.set(targetTrackId, bucket)
      this.pasted.push({ trackId: targetTrackId, clipId: newClip.id })
    }

    const updatedTracks = tracks.map((track) => {
      const extra = additions.get(track.id)
      return extra ? { ...track, clips: [...track.clips, ...extra] } : track
    })

    editor.timeline.setTracks({ tracks: updatedTracks })
    if (this.pasted.length > 0) {
      editor.selection.setSelected({ clips: this.pasted })
    }
    return true
  }
}

// --- tracks --------------------------------------------------------------

export class AddTrackCommand extends SnapshotCommand {
  private trackId = String(genid.nextId())

  getTrackId(): string {
    return this.trackId
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    const tracks = this.savedTracks ?? []
    const newTrack: AudioTrack = {
      id: this.trackId,
      name: `音轨 ${tracks.length + 1}`,
      muted: false,
      solo: false,
      clips: [],
    }
    editor.timeline.setTracks({ tracks: [...tracks, newTrack] })
    return true
  }
}

export class RemoveTrackCommand extends SnapshotCommand {
  constructor(private trackId: string) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    const tracks = this.savedTracks ?? []
    if (tracks.length <= 1) return false
    // Renumber remaining tracks so the "音轨 N" suffix stays sequential and
    // gap-free after a deletion (undo restores the original names via snapshot).
    editor.timeline.setTracks({
      tracks: tracks
        .filter((track) => track.id !== this.trackId)
        .map((track, index) => ({ ...track, name: `音轨 ${index + 1}` })),
    })
    editor.selection.setSelected({
      clips: editor.selection
        .getSelected()
        .filter((ref) => ref.trackId !== this.trackId),
    })
    return true
  }
}

// --- add clip from media (undoable "send to timeline") -------------------

export class AddClipFromMediaCommand extends SnapshotCommand {
  private clipId: string | undefined

  constructor(
    private args: {
      mediaId: string
      name: string
      duration: number
      trackId?: string
    },
  ) {
    super()
  }

  getClipId(): string | undefined {
    return this.clipId
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    this.resetIds()

    const tracks = this.savedTracks ?? []
    const trackEnd = (track: AudioTrack): number =>
      track.clips.reduce(
        (max, clip) => Math.max(max, clip.startTime + clip.duration),
        0,
      )

    // Pick the target track: explicit id, else the least-filled existing track,
    // else create a fresh one with a stable id.
    let target: AudioTrack | undefined
    if (this.args.trackId) {
      target = tracks.find((track) => track.id === this.args.trackId)
    } else if (tracks.length > 0) {
      target = tracks.reduce((least, track) =>
        trackEnd(track) < trackEnd(least) ? track : least,
      )
    }

    let createdTrack: AudioTrack | undefined
    if (!target) {
      createdTrack = {
        id: this.freshId(),
        name: '音轨 1',
        muted: false,
        solo: false,
        clips: [],
      }
      target = createdTrack
    }

    const clip: AudioClip = {
      id: this.freshId(),
      name: this.args.name,
      mediaId: this.args.mediaId,
      startTime: trackEnd(target),
      duration: this.args.duration,
      trimStart: 0,
      trimEnd: 0,
      muted: false,
      fadeIn: 0,
      fadeOut: 0,
      gainDb: 0,
    }
    this.clipId = clip.id

    const base = createdTrack ? [...tracks, createdTrack] : tracks
    const targetId = target.id
    const updatedTracks = base.map((track) =>
      track.id === targetId
        ? { ...track, clips: [...track.clips, clip] }
        : track,
    )

    editor.timeline.setTracks({ tracks: updatedTracks })
    return true
  }
}

export class ReorderTracksCommand extends SnapshotCommand {
  constructor(private newOrder: string[]) {
    super()
  }

  execute(): boolean {
    const editor = EditorCore.getInstance()
    this.snapshot(editor)
    const trackMap = new Map(
      (this.savedTracks ?? []).map((track) => [track.id, track]),
    )
    const reordered: AudioTrack[] = []
    for (const id of this.newOrder) {
      const track = trackMap.get(id)
      if (track) reordered.push(track)
    }
    editor.timeline.setTracks({ tracks: reordered })
    return true
  }
}

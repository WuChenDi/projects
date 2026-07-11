// Audio-only editor data model. Field names mirror bycut's timeline types
// (startTime / trimStart / trimEnd / volume / muted / duration) so later
// tasks (FEAT-027..029) can extend clips without a data migration.

export interface AudioClip {
  id: string
  name: string
  /** Key into the media pool (MediaAsset.id). */
  mediaId: string
  /** Seconds from the timeline origin where the clip begins. */
  startTime: number
  /** Playable length in seconds (after trimming). */
  duration: number
  /** Seconds trimmed from the source head. */
  trimStart: number
  /** Seconds trimmed from the source tail. */
  trimEnd: number
  volume: number
  muted: boolean
  /** Fade-in length in seconds (0..5), applied from the clip's head. */
  fadeIn: number
  /** Fade-out length in seconds (0..5), applied to the clip's tail. */
  fadeOut: number
  /** Per-clip gain in dB (-60..+12); -60 mutes. Combined with `volume`. */
  gainDb: number
}

export interface AudioTrack {
  id: string
  name: string
  muted: boolean
  /** When any track is soloed, only soloed tracks are audible. */
  solo: boolean
  clips: AudioClip[]
}

/** Points at a single clip on a track (selection / command target). */
export interface ClipRef {
  trackId: string
  clipId: string
}

export interface MediaAsset {
  id: string
  name: string
  file: File
  /** Full decoded duration of the source in seconds. */
  duration: number
}

/** Resolved playback source for a single clip (see audio-manager). */
export interface AudioClipSource {
  id: string
  sourceKey: string
  file: File
  startTime: number
  duration: number
  trimStart: number
  trimEnd: number
  muted: boolean
  volume: number
  playbackRate: number
  fadeIn: number
  fadeOut: number
  gainDb: number
}

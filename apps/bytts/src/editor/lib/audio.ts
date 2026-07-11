import type { AudioClipSource, AudioTrack, MediaAsset } from '@/editor/types'

// Web Audio helpers (audio-only subset ported from bycut lib/media/audio).

export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  return new AudioContextConstructor()
}

/**
 * Decodes a file just far enough to read its duration in seconds.
 * A throwaway AudioContext is used so no long-lived resources leak.
 */
export async function decodeAudioDuration({
  file,
}: {
  file: File | Blob
}): Promise<number> {
  const audioContext = createAudioContext()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    return audioBuffer.duration
  } finally {
    await audioContext.close()
  }
}

/**
 * Flattens all non-empty clips across every track into playable sources.
 * Track- and clip-level mute both mark the source `muted` (scheduling skips it);
 * when any track is soloed, non-soloed tracks are silenced regardless of mute.
 */
export function collectAudioClips({
  tracks,
  mediaAssets,
}: {
  tracks: AudioTrack[]
  mediaAssets: MediaAsset[]
}): AudioClipSource[] {
  const clips: AudioClipSource[] = []
  const mediaMap = new Map<string, MediaAsset>(
    mediaAssets.map((asset) => [asset.id, asset]),
  )
  const anySolo = tracks.some((track) => track.solo)

  for (const track of tracks) {
    const trackSilenced = anySolo ? !track.solo : track.muted
    for (const clip of track.clips) {
      if (clip.duration <= 0) continue

      const mediaAsset = mediaMap.get(clip.mediaId)
      if (!mediaAsset) continue

      clips.push({
        id: clip.id,
        sourceKey: mediaAsset.id,
        file: mediaAsset.file,
        startTime: clip.startTime,
        duration: clip.duration,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        muted: trackSilenced || clip.muted,
        volume: clip.volume,
        playbackRate: 1,
        fadeIn: clip.fadeIn ?? 0,
        fadeOut: clip.fadeOut ?? 0,
        gainDb: clip.gainDb ?? 0,
      })
    }
  }

  return clips
}

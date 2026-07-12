import { collectAudioClips } from '@/editor/lib/audio'
import { getFadeGain } from '@/editor/lib/audio-fade'
import { gainDbToLinear } from '@/editor/lib/audio-gain'
import type { AudioClipSource, AudioTrack, MediaAsset } from '@/editor/types'

// Offline mixdown for export. Adapted from bycut's createTimelineAudioBuffer /
// mixAudioChannels but driven through an OfflineAudioContext so the result
// matches the FEAT-028 preview exactly: the same collectAudioClips resolves
// mute/solo/trim, the same gainDbToLinear + getFadeGain shape the envelope.
// Muted clips (track mute, or non-soloed when any track is soloed) are dropped.

const EXPORT_SAMPLE_RATE = 44100
const EXPORT_CHANNELS = 2

// Fade envelope sampling — mirrors audio-manager's live-preview scheduling so
// exported fades read identically to what the user hears.
const FADE_SAMPLE_STEP_SECONDS = 0.01
const FADE_MAX_SAMPLES = 2048

export interface MixdownParams {
  tracks: AudioTrack[]
  mediaAssets: MediaAsset[]
  totalDuration: number
  /** Reports mixdown progress in the 0..1 range. */
  onProgress?: (progress: number) => void
}

/**
 * Renders the timeline to a stereo AudioBuffer, honoring per-clip gain, fades
 * and trims plus track mute/solo. Sources sharing a media id are decoded once.
 */
export async function renderTimelineMixdown({
  tracks,
  mediaAssets,
  totalDuration,
  onProgress,
}: MixdownParams): Promise<AudioBuffer> {
  const sources = collectAudioClips({ tracks, mediaAssets }).filter(
    (clip) => !clip.muted,
  )

  const length = Math.max(1, Math.ceil(totalDuration * EXPORT_SAMPLE_RATE))
  const offline = new OfflineAudioContext(
    EXPORT_CHANNELS,
    length,
    EXPORT_SAMPLE_RATE,
  )

  const uniqueKeys = [...new Set(sources.map((clip) => clip.sourceKey))]
  const buffers = new Map<string, AudioBuffer>()

  for (let index = 0; index < uniqueKeys.length; index += 1) {
    const key = uniqueKeys[index]
    const source = sources.find((clip) => clip.sourceKey === key)
    if (source) {
      try {
        const arrayBuffer = await source.file.arrayBuffer()
        // .slice(0) avoids the detached-buffer error on repeated decodes.
        const decoded = await offline.decodeAudioData(arrayBuffer.slice(0))
        buffers.set(key, decoded)
      } catch (error) {
        console.warn('Failed to decode audio for export:', key, error)
      }
    }
    onProgress?.(((index + 1) / uniqueKeys.length) * 0.8)
  }

  for (const clip of sources) {
    const buffer = buffers.get(clip.sourceKey)
    if (!buffer) continue
    scheduleClip({ offline, clip, buffer })
  }

  const rendered = await offline.startRendering()
  onProgress?.(1)
  return rendered
}

function scheduleClip({
  offline,
  clip,
  buffer,
}: {
  offline: OfflineAudioContext
  clip: AudioClipSource
  buffer: AudioBuffer
}): void {
  const node = offline.createBufferSource()
  node.buffer = buffer

  const baseGain = gainDbToLinear(clip.gainDb)
  const gain = offline.createGain()
  gain.gain.value = baseGain
  node.connect(gain)
  gain.connect(offline.destination)

  applyFadeEnvelope({ clip, gainParam: gain.gain, baseGain })

  node.start(clip.startTime, clip.trimStart, clip.duration)
}

/**
 * Schedules the clip's fade in/out onto its GainNode. Offline context time
 * equals timeline time (rendering starts at 0), so regions map directly. When
 * the fades overlap a single envelope spans the whole clip, matching the
 * preview's automation windows.
 */
function applyFadeEnvelope({
  clip,
  gainParam,
  baseGain,
}: {
  clip: AudioClipSource
  gainParam: AudioParam
  baseGain: number
}): void {
  const { fadeIn, fadeOut, duration, startTime } = clip
  if (fadeIn <= 0 && fadeOut <= 0) return
  if (baseGain <= 0) return

  const fi = Math.min(fadeIn, duration)
  const fo = Math.min(fadeOut, duration)

  const scheduleRegion = (regionStart: number, regionEnd: number): void => {
    const durationCtx = regionEnd - regionStart
    if (durationCtx <= 0) return

    const samples = Math.max(
      2,
      Math.min(
        FADE_MAX_SAMPLES,
        Math.ceil(durationCtx / FADE_SAMPLE_STEP_SECONDS),
      ),
    )
    const curve = new Float32Array(samples)
    for (let index = 0; index < samples; index += 1) {
      const position = regionStart + (durationCtx * index) / (samples - 1)
      curve[index] =
        baseGain * getFadeGain({ position, duration, fadeIn: fi, fadeOut: fo })
    }
    gainParam.setValueCurveAtTime(curve, startTime + regionStart, durationCtx)
  }

  const fadeOutStart = duration - fo
  const overlaps = fi > 0 && fo > 0 && fi >= fadeOutStart

  if (overlaps) {
    scheduleRegion(0, duration)
    return
  }
  if (fi > 0) scheduleRegion(0, fi)
  if (fo > 0) scheduleRegion(fadeOutStart, duration)
}

import type { EditorCore } from '@/editor/core'
import { collectAudioClips, createAudioContext } from '@/editor/lib/audio'
import { getFadeGain } from '@/editor/lib/audio-fade'
import { gainDbToLinear } from '@/editor/lib/audio-gain'
import type { AudioClipSource } from '@/editor/types'

// Envelope sampling resolution for fade curves scheduled via setValueCurveAtTime.
const FADE_SAMPLE_STEP_SECONDS = 0.01
const FADE_MAX_SAMPLES = 2048

// Sample-accurate Web Audio preview. Ported from bycut's audio-manager:
// buffers are decoded lazily, cached by source key, and scheduled against the
// AudioContext clock so multiple tracks/clips mix in sync with the transport.

export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private playbackStartTime = 0
  private playbackStartContextTime = 0
  private clips: AudioClipSource[] = []
  private decodedBuffers = new Map<string, AudioBuffer>()
  private queuedSources = new Set<AudioBufferSourceNode>()
  private playbackSessionId = 0
  private lastIsPlaying = false
  private lastVolume = 1
  private unsubscribers: Array<() => void> = []
  private timelineChangeTimer: number | null = null

  constructor(private editor: EditorCore) {
    this.lastVolume = this.editor.playback.getVolume()

    this.unsubscribers.push(
      this.editor.playback.subscribe(this.handlePlaybackChange),
      this.editor.timeline.subscribe(this.handleTimelineChange),
      this.editor.media.subscribe(this.handleTimelineChange),
    )
    if (typeof window !== 'undefined') {
      window.addEventListener('playback-seek', this.handleSeek)
    }
  }

  dispose(): void {
    this.stopPlayback()
    if (this.timelineChangeTimer !== null) {
      window.clearTimeout(this.timelineChangeTimer)
      this.timelineChangeTimer = null
    }
    for (const unsub of this.unsubscribers) unsub()
    this.unsubscribers = []
    if (typeof window !== 'undefined') {
      window.removeEventListener('playback-seek', this.handleSeek)
    }
    this.decodedBuffers.clear()
    if (this.audioContext) {
      void this.audioContext.close()
      this.audioContext = null
      this.masterGain = null
    }
  }

  private handlePlaybackChange = (): void => {
    const isPlaying = this.editor.playback.getIsPlaying()
    const volume = this.editor.playback.getVolume()

    if (volume !== this.lastVolume) {
      this.lastVolume = volume
      this.updateGain()
    }

    if (isPlaying !== this.lastIsPlaying) {
      this.lastIsPlaying = isPlaying
      if (isPlaying) {
        void this.startPlayback({
          time: this.editor.playback.getCurrentTime(),
        })
      } else {
        this.stopPlayback()
      }
    }
  }

  private handleSeek = (event: Event): void => {
    const detail = (event as CustomEvent<{ time: number }>).detail
    if (!detail) return

    if (this.editor.playback.getIsScrubbing()) {
      this.stopPlayback()
      return
    }

    if (this.editor.playback.getIsPlaying()) {
      void this.startPlayback({ time: detail.time })
      return
    }

    this.stopPlayback()
  }

  private handleTimelineChange = (): void => {
    if (this.timelineChangeTimer !== null) {
      window.clearTimeout(this.timelineChangeTimer)
    }

    this.timelineChangeTimer = window.setTimeout(() => {
      this.timelineChangeTimer = null
      this.decodedBuffers.clear()

      if (!this.editor.playback.getIsPlaying()) return

      void this.startPlayback({
        time: this.editor.playback.getCurrentTime(),
      })
    }, 300)
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext
    if (typeof window === 'undefined') return null

    this.audioContext = createAudioContext()
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = this.lastVolume
    this.masterGain.connect(this.audioContext.destination)
    return this.audioContext
  }

  private updateGain(): void {
    if (!this.masterGain) return
    this.masterGain.gain.value = this.lastVolume
  }

  private async startPlayback({ time }: { time: number }): Promise<void> {
    const audioContext = this.ensureAudioContext()
    if (!audioContext) return

    this.stopPlayback()
    this.playbackSessionId++
    const sessionId = this.playbackSessionId

    const tracks = this.editor.timeline.getTracks()
    const mediaAssets = this.editor.media.getAssets()
    const duration = this.editor.timeline.getTotalDuration()

    if (duration <= 0) return

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    this.clips = collectAudioClips({ tracks, mediaAssets })
    if (!this.editor.playback.getIsPlaying()) return
    if (sessionId !== this.playbackSessionId) return

    this.playbackStartTime = time
    this.playbackStartContextTime = audioContext.currentTime

    await this.scheduleAllClips({ time, sessionId })
  }

  private async scheduleAllClips({
    time,
    sessionId,
  }: {
    time: number
    sessionId: number
  }): Promise<void> {
    const audioContext = this.audioContext
    if (!audioContext) return

    for (const clip of this.clips) {
      if (clip.muted) continue

      const clipEnd = clip.startTime + clip.duration
      if (clipEnd <= time) continue
      if (sessionId !== this.playbackSessionId) return

      try {
        const buffer = await this.getDecodedBuffer({ clip })
        if (!buffer) continue
        if (sessionId !== this.playbackSessionId) return
        if (!this.editor.playback.getIsPlaying()) return

        this.scheduleClipNode({ clip, buffer, time })
      } catch (error) {
        console.warn('Failed to schedule audio clip:', clip.id, error)
      }
    }
  }

  private scheduleClipNode({
    clip,
    buffer,
    time,
  }: {
    clip: AudioClipSource
    buffer: AudioBuffer
    time: number
  }): void {
    const audioContext = this.audioContext
    if (!audioContext || !this.masterGain) return

    const rate = clip.playbackRate
    const elapsed = Math.max(0, time - clip.startTime)
    const sourceOffset = clip.trimStart + elapsed * rate
    const remainingDuration = clip.duration - elapsed

    if (remainingDuration <= 0) return

    const timelineStart = Math.max(clip.startTime, time)
    const scheduleTime =
      this.playbackStartContextTime + (timelineStart - this.playbackStartTime)

    const node = audioContext.createBufferSource()
    node.buffer = buffer
    node.playbackRate.value = rate

    const baseGain = clip.volume * gainDbToLinear(clip.gainDb)
    const clipGain = audioContext.createGain()
    clipGain.gain.value = baseGain
    node.connect(clipGain)
    clipGain.connect(this.masterGain)

    this.applyFadeEnvelope({ clip, gainParam: clipGain.gain, baseGain })

    if (scheduleTime >= audioContext.currentTime) {
      node.start(scheduleTime, sourceOffset, remainingDuration)
    } else {
      const late = audioContext.currentTime - scheduleTime
      const adjustedOffset = sourceOffset + late * rate
      const adjustedDuration = remainingDuration - late
      if (adjustedDuration > 0) {
        node.start(audioContext.currentTime, adjustedOffset, adjustedDuration)
      } else {
        return
      }
    }

    this.queuedSources.add(node)
    node.addEventListener('ended', () => {
      node.disconnect()
      this.queuedSources.delete(node)
    })
  }

  /**
   * Schedules the clip's fade in/out onto its GainNode by sampling the fade
   * curve into `setValueCurveAtTime` ramps. The two fade regions are scheduled
   * independently (steady `baseGain` holds in between); when the fades overlap
   * (fadeIn + fadeOut > duration) a single envelope across the whole clip is
   * used so the automation windows never collide. Regions already in the past
   * (mid-clip playback start) are clamped to the context clock.
   */
  private applyFadeEnvelope({
    clip,
    gainParam,
    baseGain,
  }: {
    clip: AudioClipSource
    gainParam: AudioParam
    baseGain: number
  }): void {
    const audioContext = this.audioContext
    if (!audioContext) return

    const { fadeIn, fadeOut, duration } = clip
    if (fadeIn <= 0 && fadeOut <= 0) return
    if (baseGain <= 0) return

    const fi = Math.min(fadeIn, duration)
    const fo = Math.min(fadeOut, duration)
    const now = audioContext.currentTime

    const toContext = (timelineTime: number): number =>
      this.playbackStartContextTime + (timelineTime - this.playbackStartTime)

    const scheduleRegion = (regionStart: number, regionEnd: number): void => {
      const fromCtx = Math.max(now, toContext(clip.startTime + regionStart))
      const toCtx = toContext(clip.startTime + regionEnd)
      const durationCtx = toCtx - fromCtx
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
        const ctxTime = fromCtx + (durationCtx * index) / (samples - 1)
        const timelineTime =
          this.playbackStartTime + (ctxTime - this.playbackStartContextTime)
        const position = timelineTime - clip.startTime
        curve[index] =
          baseGain *
          getFadeGain({ position, duration, fadeIn: fi, fadeOut: fo })
      }
      gainParam.setValueCurveAtTime(curve, fromCtx, durationCtx)
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

  private async getDecodedBuffer({
    clip,
  }: {
    clip: AudioClipSource
  }): Promise<AudioBuffer | null> {
    const cached = this.decodedBuffers.get(clip.sourceKey)
    if (cached) return cached

    const audioContext = this.audioContext
    if (!audioContext) return null

    try {
      const arrayBuffer = await clip.file.arrayBuffer()
      // .slice(0) avoids the detached-buffer error on repeated decodes
      const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
      this.decodedBuffers.set(clip.sourceKey, buffer)
      return buffer
    } catch (error) {
      console.warn('Failed to decode audio:', clip.sourceKey, error)
      return null
    }
  }

  private stopPlayback(): void {
    for (const source of this.queuedSources) {
      try {
        source.stop()
      } catch {}
      source.disconnect()
    }
    this.queuedSources.clear()
  }
}

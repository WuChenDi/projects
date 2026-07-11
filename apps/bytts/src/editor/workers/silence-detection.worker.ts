/// <reference lib="webworker" />

import type {
  AudioBufferLike,
  AudioSilenceDetectionOptions,
  AudioSilenceRange,
} from '@/editor/lib/audio-silence'
import { detectSilentRanges } from '@/editor/lib/audio-silence'

// Off-thread silence scan. The clip's visible region is decoded on the main
// thread and its channel data transferred here (zero-copy); ranges come back in
// region-relative seconds. Ported from freecut's silence-detection-worker.ts.

interface SilenceDetectionRequest {
  id: string
  channels: ArrayBuffer[]
  sampleRate: number
  settings: AudioSilenceDetectionOptions
}

interface SilenceDetectionResponse {
  id: string
  ranges?: AudioSilenceRange[]
  error?: string
}

self.addEventListener(
  'message',
  (event: MessageEvent<SilenceDetectionRequest>) => {
    const { id, channels, sampleRate, settings } = event.data
    try {
      const data = channels.map((channel) => new Float32Array(channel))
      const length = data[0]?.length ?? 0
      const buffer: AudioBufferLike = {
        duration: sampleRate > 0 ? length / sampleRate : 0,
        length,
        numberOfChannels: data.length,
        sampleRate,
        getChannelData: (channel) => data[channel] ?? new Float32Array(),
      }
      const ranges = detectSilentRanges(buffer, settings)
      self.postMessage({ id, ranges } satisfies SilenceDetectionResponse)
    } catch (error) {
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      } satisfies SilenceDetectionResponse)
    }
  },
)

export {}

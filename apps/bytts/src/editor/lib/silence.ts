import { createAudioContext } from '@/editor/lib/audio'
import type {
  AudioSilenceDetectionOptions,
  AudioSilenceRange,
} from '@/editor/lib/audio-silence'
import { genid } from '@/lib/genid'

// Decodes a clip's *visible* region, hands its channel data to the silence
// worker, and returns the detected silent ranges in clip-relative seconds
// (0..duration). Decoding the trimmed region (rather than the whole source)
// means the worker's ranges map straight onto timeline splits at
// clip.startTime + range.start / range.end — no trim arithmetic downstream.

interface SilenceDetectionResponse {
  id: string
  ranges?: AudioSilenceRange[]
  error?: string
}

async function decodeRegionChannels({
  file,
  trimStart,
  duration,
}: {
  file: File
  trimStart: number
  duration: number
}): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const audioContext = createAudioContext()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const sampleRate = decoded.sampleRate
    const startSample = Math.max(0, Math.floor(trimStart * sampleRate))
    const endSample = Math.min(
      decoded.length,
      Math.ceil((trimStart + duration) * sampleRate),
    )
    const regionLength = Math.max(0, endSample - startSample)
    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, channel) =>
        decoded.getChannelData(channel).slice(startSample, endSample),
    )
    if (channels.length === 0) {
      channels.push(new Float32Array(regionLength))
    }
    return { channels, sampleRate }
  } finally {
    await audioContext.close()
  }
}

export async function detectClipSilence({
  file,
  trimStart,
  duration,
  options,
}: {
  file: File
  trimStart: number
  duration: number
  options: AudioSilenceDetectionOptions
}): Promise<AudioSilenceRange[]> {
  const { channels, sampleRate } = await decodeRegionChannels({
    file,
    trimStart,
    duration,
  })

  const worker = new Worker(
    new URL('../workers/silence-detection.worker.ts', import.meta.url),
  )
  const requestId = String(genid.nextId())
  const buffers = channels.map((channel) => channel.buffer as ArrayBuffer)

  try {
    return await new Promise<AudioSilenceRange[]>((resolve, reject) => {
      worker.addEventListener(
        'message',
        (event: MessageEvent<SilenceDetectionResponse>) => {
          const data = event.data
          if (data.id !== requestId) return
          if (data.error) {
            reject(new Error(data.error))
            return
          }
          resolve(data.ranges ?? [])
        },
      )
      worker.addEventListener('error', (event) => {
        reject(new Error(event.message || 'silence worker error'))
      })
      worker.postMessage(
        { id: requestId, channels: buffers, sampleRate, settings: options },
        buffers,
      )
    })
  } finally {
    worker.terminate()
  }
}

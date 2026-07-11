// Audio encoders for export. mp3 goes through mediabunny's Output pipeline with
// the LAME WASM fallback registered on demand; wav is a zero-dep RIFF writer
// ported from bycut's lib/media/mediabunny.ts. Both mediabunny modules are
// dynamically imported so the encoder chunk (and its Worker/WASM) never lands
// in the editor bundle and never reaches the workerd/edge build.

export type ExportFormat = 'mp3' | 'wav'

const EXPORT_CHANNELS = 2
const MP3_BITRATE = 128000
// Frames per AudioSample fed to the encoder — bounds each planar allocation.
const ENCODE_CHUNK_FRAMES = 48000

export interface EncodeParams {
  audioBuffer: AudioBuffer
  format: ExportFormat
  /** Reports encode progress in the 0..1 range. */
  onProgress?: (progress: number) => void
}

export async function encodeAudioBuffer({
  audioBuffer,
  format,
  onProgress,
}: EncodeParams): Promise<Blob> {
  if (format === 'wav') {
    const blob = createWavBlob({ audioBuffer })
    onProgress?.(1)
    return blob
  }
  return encodeMp3({ audioBuffer, onProgress })
}

async function encodeMp3({
  audioBuffer,
  onProgress,
}: {
  audioBuffer: AudioBuffer
  onProgress?: (progress: number) => void
}): Promise<Blob> {
  const {
    Output,
    Mp3OutputFormat,
    BufferTarget,
    AudioSampleSource,
    AudioSample,
    canEncodeAudio,
  } = await import('mediabunny')

  // Chromium has no built-in MP3 encoder; register the WASM LAME fallback.
  if (!(await canEncodeAudio('mp3'))) {
    const { registerMp3Encoder } = await import('@mediabunny/mp3-encoder')
    registerMp3Encoder()
  }

  const target = new BufferTarget()
  const output = new Output({ format: new Mp3OutputFormat(), target })
  const source = new AudioSampleSource({ codec: 'mp3', bitrate: MP3_BITRATE })
  output.addAudioTrack(source)
  await output.start()

  const sampleRate = audioBuffer.sampleRate
  const totalFrames = audioBuffer.length
  const left = audioBuffer.getChannelData(0)
  const right =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

  for (let offset = 0; offset < totalFrames; offset += ENCODE_CHUNK_FRAMES) {
    const frameCount = Math.min(ENCODE_CHUNK_FRAMES, totalFrames - offset)
    const planar = new Float32Array(frameCount * EXPORT_CHANNELS)
    planar.set(left.subarray(offset, offset + frameCount), 0)
    planar.set(right.subarray(offset, offset + frameCount), frameCount)

    const sample = new AudioSample({
      data: planar,
      format: 'f32-planar',
      numberOfChannels: EXPORT_CHANNELS,
      sampleRate,
      timestamp: offset / sampleRate,
    })
    try {
      await source.add(sample)
    } finally {
      sample.close()
    }
    onProgress?.(Math.min(1, (offset + frameCount) / totalFrames))
  }

  source.close()
  await output.finalize()

  const buffer = target.buffer
  if (!buffer) throw new Error('MP3 encoding produced no output')
  return new Blob([buffer], { type: 'audio/mpeg' })
}

/** Interleaves a stereo AudioBuffer into a 16-bit PCM WAV blob. */
export function createWavBlob({
  audioBuffer,
}: {
  audioBuffer: AudioBuffer
}): Blob {
  const numChannels = EXPORT_CHANNELS
  const sampleRate = audioBuffer.sampleRate
  const numFrames = audioBuffer.length
  const left = audioBuffer.getChannelData(0)
  const right =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const dataSize = numFrames * numChannels * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  writeString({ view, offset: 0, str: 'RIFF' })
  view.setUint32(4, 36 + dataSize, true)
  writeString({ view, offset: 8, str: 'WAVE' })

  writeString({ view, offset: 12, str: 'fmt ' })
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)

  writeString({ view, offset: 36, str: 'data' })
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numFrames; i += 1) {
    const l = Math.max(-1, Math.min(1, left[i]))
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true)
    offset += 2
    const r = Math.max(-1, Math.min(1, right[i]))
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true)
    offset += 2
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString({
  view,
  offset,
  str,
}: {
  view: DataView
  offset: number
  str: string
}): void {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

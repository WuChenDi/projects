// Silence detection. Ported from freecut's `shared/utils/audio-silence.ts`:
// a windowed max-RMS scan with a hysteresis state machine (a run must stay below
// the silence threshold for `minSilenceMs` to count, and rise back above the
// audio threshold for `minAudioMs` to close). Padding keeps a little air around
// each cut. Runs in a Web Worker (silence-detection.worker.ts) on raw channel
// data so the UI thread never blocks.

export interface AudioSilenceRange {
  start: number
  end: number
}

export interface AudioSilenceDetectionOptions {
  silenceThresholdDb?: number
  audioThresholdDb?: number
  minSilenceMs?: number
  minAudioMs?: number
  paddingMs?: number
  windowMs?: number
}

export interface AudioBufferLike {
  duration: number
  length: number
  numberOfChannels: number
  sampleRate: number
  getChannelData(channel: number): Float32Array
}

export const DEFAULT_SILENCE_THRESHOLD_DB = -45
export const DEFAULT_AUDIO_THRESHOLD_DB = -35
export const DEFAULT_MIN_SILENCE_MS = 500
export const DEFAULT_MIN_AUDIO_MS = 80
export const DEFAULT_PADDING_MS = 100
const DEFAULT_WINDOW_MS = 20

function dbToAmplitude(db: number): number {
  return 10 ** (db / 20)
}

function clampNumber(
  value: number | undefined,
  fallback: number,
  min: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(min, value)
}

function getWindowMaxRms(
  channels: Float32Array[],
  startSample: number,
  endSample: number,
): number {
  let maxRms = 0
  const sampleCount = Math.max(1, endSample - startSample)
  for (const channel of channels) {
    let sumSquares = 0
    for (let sample = startSample; sample < endSample; sample += 1) {
      const value = channel[sample] ?? 0
      sumSquares += value * value
    }
    maxRms = Math.max(maxRms, Math.sqrt(sumSquares / sampleCount))
  }
  return maxRms
}

interface WindowLevel {
  endSample: number
  rms: number
  startSample: number
}

function collectWindowLevels(
  audioBuffer: AudioBufferLike,
  windowMs: number,
): WindowLevel[] {
  const windowSamples = Math.max(
    1,
    Math.round((windowMs / 1000) * audioBuffer.sampleRate),
  )
  const channels = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, channel) => audioBuffer.getChannelData(channel),
  )
  const levels: WindowLevel[] = []
  for (
    let startSample = 0;
    startSample < audioBuffer.length;
    startSample += windowSamples
  ) {
    const endSample = Math.min(audioBuffer.length, startSample + windowSamples)
    levels.push({
      startSample,
      endSample,
      rms: getWindowMaxRms(channels, startSample, endSample),
    })
  }
  return levels
}

function pushPaddedRange(
  ranges: AudioSilenceRange[],
  startSample: number,
  endSample: number,
  sampleRate: number,
  paddingSamples: number,
): void {
  const paddedStart = Math.min(endSample, startSample + paddingSamples)
  const paddedEnd = Math.max(paddedStart, endSample - paddingSamples)
  if (paddedEnd <= paddedStart) return
  ranges.push({ start: paddedStart / sampleRate, end: paddedEnd / sampleRate })
}

export function detectSilentRanges(
  audioBuffer: AudioBufferLike,
  options: AudioSilenceDetectionOptions = {},
): AudioSilenceRange[] {
  if (
    audioBuffer.length <= 0 ||
    audioBuffer.sampleRate <= 0 ||
    audioBuffer.numberOfChannels <= 0 ||
    audioBuffer.duration <= 0
  ) {
    return []
  }

  const windowMs = clampNumber(options.windowMs, DEFAULT_WINDOW_MS, 1)
  const silenceThresholdDb = clampNumber(
    options.silenceThresholdDb,
    DEFAULT_SILENCE_THRESHOLD_DB,
    -100,
  )
  const audioThresholdDb = Math.max(
    silenceThresholdDb + 1,
    clampNumber(options.audioThresholdDb, DEFAULT_AUDIO_THRESHOLD_DB, -100),
  )
  const toSamples = (milliseconds: number) =>
    Math.round((milliseconds / 1000) * audioBuffer.sampleRate)
  const minSilenceSamples = toSamples(
    clampNumber(options.minSilenceMs, DEFAULT_MIN_SILENCE_MS, 1),
  )
  const minAudioSamples = toSamples(
    clampNumber(options.minAudioMs, DEFAULT_MIN_AUDIO_MS, 1),
  )
  const paddingSamples = toSamples(
    clampNumber(options.paddingMs, DEFAULT_PADDING_MS, 0),
  )
  const silenceThreshold = dbToAmplitude(silenceThresholdDb)
  const audioThreshold = dbToAmplitude(audioThresholdDb)

  const levels = collectWindowLevels(audioBuffer, windowMs)
  const ranges: AudioSilenceRange[] = []
  let belowThresholdStart: number | null = null
  let silenceStart: number | null = null
  let aboveThresholdStart: number | null = null

  for (const level of levels) {
    if (silenceStart === null) {
      if (level.rms <= silenceThreshold) {
        belowThresholdStart ??= level.startSample
        if (level.endSample - belowThresholdStart >= minSilenceSamples) {
          silenceStart = belowThresholdStart
          aboveThresholdStart = null
        }
      } else {
        belowThresholdStart = null
      }
      continue
    }

    if (level.rms >= audioThreshold) {
      aboveThresholdStart ??= level.startSample
      if (level.endSample - aboveThresholdStart >= minAudioSamples) {
        pushPaddedRange(
          ranges,
          silenceStart,
          aboveThresholdStart,
          audioBuffer.sampleRate,
          paddingSamples,
        )
        silenceStart = null
        belowThresholdStart = null
        aboveThresholdStart = null
      }
    } else {
      aboveThresholdStart = null
    }
  }

  if (silenceStart !== null) {
    pushPaddedRange(
      ranges,
      silenceStart,
      audioBuffer.length,
      audioBuffer.sampleRate,
      paddingSamples,
    )
  }

  return ranges
}

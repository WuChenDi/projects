import { TIMELINE_CONSTANTS } from '@/editor/constants'
import { formatTimestamp } from '@/editor/lib/time'

// Ruler tick/label interval math (ported from bycut lib/timeline/ruler-utils).

const LABEL_FRAME_INTERVALS = [2, 3, 5, 10, 15] as const
const TICK_FRAME_INTERVALS = [1, 2, 3, 5, 10, 15] as const
const SECOND_MULTIPLIERS = [
  1, 2, 3, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
] as const

const MIN_LABEL_SPACING_PX = 120
const MIN_TICK_SPACING_PX = 18

export interface RulerConfig {
  labelIntervalSeconds: number
  tickIntervalSeconds: number
}

export function getRulerConfig({
  zoomLevel,
  fps,
}: {
  zoomLevel: number
  fps: number
}): RulerConfig {
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  const pixelsPerFrame = pixelsPerSecond / fps

  const labelIntervalSeconds = findOptimalInterval({
    pixelsPerFrame,
    pixelsPerSecond,
    fps,
    minSpacingPx: MIN_LABEL_SPACING_PX,
    frameIntervals: LABEL_FRAME_INTERVALS,
  })

  const rawTickIntervalSeconds = findOptimalInterval({
    pixelsPerFrame,
    pixelsPerSecond,
    fps,
    minSpacingPx: MIN_TICK_SPACING_PX,
    frameIntervals: TICK_FRAME_INTERVALS,
  })

  const tickIntervalSeconds = ensureTickDividesLabel({
    tickIntervalSeconds: rawTickIntervalSeconds,
    labelIntervalSeconds,
    pixelsPerFrame,
    pixelsPerSecond,
    fps,
  })

  return { labelIntervalSeconds, tickIntervalSeconds }
}

function ensureTickDividesLabel({
  tickIntervalSeconds,
  labelIntervalSeconds,
  pixelsPerFrame,
  pixelsPerSecond,
  fps,
}: {
  tickIntervalSeconds: number
  labelIntervalSeconds: number
  pixelsPerFrame: number
  pixelsPerSecond: number
  fps: number
}): number {
  const labelFrames = Math.round(labelIntervalSeconds * fps)
  const tickFrames = Math.round(tickIntervalSeconds * fps)

  if (labelFrames % tickFrames === 0) {
    return tickIntervalSeconds
  }

  for (const candidateFrames of TICK_FRAME_INTERVALS) {
    if (labelFrames % candidateFrames === 0) {
      const candidateSpacing = pixelsPerFrame * candidateFrames
      if (candidateSpacing >= MIN_TICK_SPACING_PX) {
        return candidateFrames / fps
      }
    }
  }

  for (const candidateSeconds of SECOND_MULTIPLIERS) {
    const ratio = labelIntervalSeconds / candidateSeconds
    const isDivisor = Math.abs(ratio - Math.round(ratio)) < 0.0001
    if (isDivisor) {
      const candidateSpacing = pixelsPerSecond * candidateSeconds
      if (candidateSpacing >= MIN_TICK_SPACING_PX) {
        return candidateSeconds
      }
    }
  }

  return labelIntervalSeconds
}

function findOptimalInterval({
  pixelsPerFrame,
  pixelsPerSecond,
  fps,
  minSpacingPx,
  frameIntervals,
}: {
  pixelsPerFrame: number
  pixelsPerSecond: number
  fps: number
  minSpacingPx: number
  frameIntervals: readonly number[]
}): number {
  for (const frameInterval of frameIntervals) {
    const pixelSpacing = pixelsPerFrame * frameInterval
    if (pixelSpacing >= minSpacingPx) {
      return frameInterval / fps
    }
  }

  for (const secondMultiplier of SECOND_MULTIPLIERS) {
    const pixelSpacing = pixelsPerSecond * secondMultiplier
    if (pixelSpacing >= minSpacingPx) {
      return secondMultiplier
    }
  }

  return 60
}

export function shouldShowLabel({
  time,
  labelIntervalSeconds,
}: {
  time: number
  labelIntervalSeconds: number
}): boolean {
  const epsilon = 0.0001
  const remainder = time % labelIntervalSeconds
  return remainder < epsilon || remainder > labelIntervalSeconds - epsilon
}

export function formatRulerLabel({
  timeInSeconds,
  fps,
}: {
  timeInSeconds: number
  fps: number
}): string {
  if (isSecondBoundary({ timeInSeconds })) {
    return formatTimestamp({ timeInSeconds })
  }

  const frameWithinSecond = getFrameWithinSecond({ timeInSeconds, fps })
  return `${frameWithinSecond}f`
}

function isSecondBoundary({
  timeInSeconds,
}: {
  timeInSeconds: number
}): boolean {
  const epsilon = 0.0001
  const remainder = timeInSeconds % 1
  return remainder < epsilon || remainder > 1 - epsilon
}

function getFrameWithinSecond({
  timeInSeconds,
  fps,
}: {
  timeInSeconds: number
  fps: number
}): number {
  const fractionalPart = timeInSeconds % 1
  return Math.round(fractionalPart * fps)
}

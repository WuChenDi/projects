// Per-clip fade curve math. The power-curve evaluators are ported verbatim from
// freecut's `shared/utils/audio-fade-curve.ts`; `getFadeGain` wraps them in a
// seconds-based envelope the preview scheduler (and later the FEAT-029 export
// mixdown) samples into a GainNode ramp. The editor UI only exposes fade
// *duration* (0..5 s), so the curve shape stays at its neutral default (linear),
// but the full evaluator is kept so a curve control can be added without a data
// migration.

/** Max per-side fade length, in seconds. */
export const FADE_MAX_SECONDS = 5

const AUDIO_FADE_CURVE_X_DEFAULT = 0.52
const AUDIO_FADE_CURVE_X_MIN = 0.04
const AUDIO_FADE_CURVE_X_MAX = 0.96
const AUDIO_FADE_CURVE_SOLVE_EPSILON = 0.0001
const AUDIO_FADE_CURVE_MAX_EXPONENT = 12

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampAudioFadeCurveX(curveX: number | undefined): number {
  const value =
    typeof curveX === 'number' && Number.isFinite(curveX)
      ? curveX
      : AUDIO_FADE_CURVE_X_DEFAULT
  return Math.max(
    AUDIO_FADE_CURVE_X_MIN,
    Math.min(AUDIO_FADE_CURVE_X_MAX, Math.round(value * 1000) / 1000),
  )
}

function clampAudioFadeCurve(curve: number | undefined): number {
  const value = typeof curve === 'number' && Number.isFinite(curve) ? curve : 0
  return Math.max(-1, Math.min(1, Math.round(value * 100) / 100))
}

function getFadeInControlY(
  curve: number | undefined,
  curveX: number | undefined,
): number {
  const normalizedX = clampAudioFadeCurveX(curveX)
  const normalizedCurve = clampAudioFadeCurve(curve)
  const linearY = normalizedX
  return normalizedCurve >= 0
    ? linearY + normalizedCurve * (1 - linearY)
    : linearY + normalizedCurve * linearY
}

function getFadeOutControlY(
  curve: number | undefined,
  curveX: number | undefined,
): number {
  const normalizedX = clampAudioFadeCurveX(curveX)
  const normalizedCurve = clampAudioFadeCurve(curve)
  const linearY = 1 - normalizedX
  return normalizedCurve >= 0
    ? linearY + normalizedCurve * (1 - linearY)
    : linearY + normalizedCurve * linearY
}

function clampUnitForSolve(value: number): number {
  return Math.max(
    AUDIO_FADE_CURVE_SOLVE_EPSILON,
    Math.min(1 - AUDIO_FADE_CURVE_SOLVE_EPSILON, value),
  )
}

function solvePowerExponent(base: number, target: number): number {
  const exponent =
    Math.log(clampUnitForSolve(target)) / Math.log(clampUnitForSolve(base))
  if (!Number.isFinite(exponent)) return AUDIO_FADE_CURVE_MAX_EXPONENT
  return Math.max(1, Math.min(AUDIO_FADE_CURVE_MAX_EXPONENT, exponent))
}

function evaluatePowerCurve(progress: number, exponent: number): number {
  return clampUnit(progress) ** exponent
}

export function evaluateAudioFadeInCurve(
  progress: number,
  curve?: number,
  curveX?: number,
): number {
  const normalizedProgress = clampUnit(progress)
  const pointX = clampAudioFadeCurveX(curveX)
  const pointY = getFadeInControlY(curve, curveX)

  if (Math.abs(pointY - pointX) <= AUDIO_FADE_CURVE_SOLVE_EPSILON) {
    return normalizedProgress
  }
  if (pointY > pointX) {
    const exponent = solvePowerExponent(1 - pointX, 1 - pointY)
    return 1 - evaluatePowerCurve(1 - normalizedProgress, exponent)
  }
  const exponent = solvePowerExponent(pointX, pointY)
  return evaluatePowerCurve(normalizedProgress, exponent)
}

export function evaluateAudioFadeOutCurve(
  progress: number,
  curve?: number,
  curveX?: number,
): number {
  const normalizedProgress = clampUnit(progress)
  const pointX = clampAudioFadeCurveX(curveX)
  const pointY = getFadeOutControlY(curve, curveX)
  const linearY = 1 - pointX

  if (Math.abs(pointY - linearY) <= AUDIO_FADE_CURVE_SOLVE_EPSILON) {
    return 1 - normalizedProgress
  }
  if (pointY > linearY) {
    const exponent = solvePowerExponent(pointX, 1 - pointY)
    return 1 - evaluatePowerCurve(normalizedProgress, exponent)
  }
  const exponent = solvePowerExponent(1 - pointX, pointY)
  return evaluatePowerCurve(1 - normalizedProgress, exponent)
}

/**
 * Fade gain multiplier (0..1) for a position inside a clip, in seconds.
 * Handles the overlapping-fades case (fadeIn + fadeOut > duration) with the same
 * triangular-peak fallback freecut uses so the envelope never exceeds 1.
 */
export function getFadeGain({
  position,
  duration,
  fadeIn,
  fadeOut,
}: {
  position: number
  duration: number
  fadeIn: number
  fadeOut: number
}): number {
  if (duration <= 0) return 1
  const fi = Math.min(Math.max(0, fadeIn), duration)
  const fo = Math.min(Math.max(0, fadeOut), duration)
  const hasIn = fi > 0
  const hasOut = fo > 0
  if (!hasIn && !hasOut) return 1
  if (position <= 0) return hasIn ? 0 : 1
  if (position >= duration) return hasOut ? 0 : 1

  const fadeOutStart = duration - fo

  if (hasIn && hasOut && fi >= fadeOutStart) {
    const midPoint = duration / 2
    const peak = Math.min(1, midPoint / Math.max(fi, 1e-6))
    if (position <= midPoint) {
      return (position / Math.max(midPoint, 1e-6)) * peak
    }
    return ((duration - position) / Math.max(duration - midPoint, 1e-6)) * peak
  }

  if (hasIn && position < fi) {
    return evaluateAudioFadeInCurve(position / fi)
  }
  if (hasOut && position > fadeOutStart) {
    return evaluateAudioFadeOutCurve((position - fadeOutStart) / fo)
  }
  return 1
}

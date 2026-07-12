// Per-clip fade curve math. `getFadeGain` builds a seconds-based envelope the
// preview scheduler (and the export mixdown) samples into a GainNode ramp. The
// editor UI only exposes fade *duration* (0..5 s), so the envelope is linear.

/** Max per-side fade length, in seconds. */
export const FADE_MAX_SECONDS = 5

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
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
    return position / fi
  }
  if (hasOut && position > fadeOutStart) {
    return 1 - (position - fadeOutStart) / fo
  }
  return 1
}

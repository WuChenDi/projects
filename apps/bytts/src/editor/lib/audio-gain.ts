// Per-clip gain, expressed in decibels. `-60 dB` is treated as a hard mute so the
// slider's low end silences the clip; the linear multiplier is what the preview
// GainNode (and the FEAT-029 export mixdown) actually apply.

export const GAIN_DB_MIN = -60
export const GAIN_DB_MAX = 12
export const GAIN_DB_DEFAULT = 0

/** dB → linear gain. At (or below) the floor the clip is fully muted. */
export function gainDbToLinear(db: number): number {
  if (!Number.isFinite(db) || db <= GAIN_DB_MIN) return 0
  return 10 ** (Math.min(db, GAIN_DB_MAX) / 20)
}

export function clampGainDb(db: number): number {
  if (!Number.isFinite(db)) return GAIN_DB_DEFAULT
  return Math.max(GAIN_DB_MIN, Math.min(GAIN_DB_MAX, db))
}

/** Fraction (0 = top / +max dB, 1 = bottom / floor) for the draggable volume line. */
export function gainDbToFraction(db: number): number {
  const clamped = clampGainDb(db)
  return (GAIN_DB_MAX - clamped) / (GAIN_DB_MAX - GAIN_DB_MIN)
}

/** Inverse of gainDbToFraction, for pointer-driven dragging. */
export function fractionToGainDb(fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction))
  return clampGainDb(GAIN_DB_MAX - clamped * (GAIN_DB_MAX - GAIN_DB_MIN))
}

export function formatGainDb(db: number): string {
  const clamped = clampGainDb(db)
  if (clamped <= GAIN_DB_MIN) return '静音'
  const rounded = Math.round(clamped * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded} dB`
}

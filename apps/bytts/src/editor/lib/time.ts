// Frame-snapping helpers (audio-only subset ported from bycut lib/time).

export function roundToFrame({
  time,
  fps,
}: {
  time: number
  fps: number
}): number {
  return Math.round(time * fps) / fps
}

export function snapTimeToFrame({
  time,
  fps,
}: {
  time: number
  fps: number
}): number {
  if (fps <= 0) return time
  return roundToFrame({ time, fps })
}

export function getSnappedSeekTime({
  rawTime,
  duration,
  fps,
}: {
  rawTime: number
  duration: number
  fps: number
}): number {
  const snappedTime = snapTimeToFrame({ time: rawTime, fps })
  return Math.max(0, Math.min(duration, snappedTime))
}

/** Formats seconds as MM:SS (or H:MM:SS beyond an hour). */
export function formatTimestamp({
  timeInSeconds,
}: {
  timeInSeconds: number
}): string {
  const totalSeconds = Math.max(0, Math.floor(timeInSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

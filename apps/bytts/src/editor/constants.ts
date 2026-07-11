// Timeline layout + zoom constants (audio-only subset ported from bycut).

export const TIMELINE_CONSTANTS = {
  PIXELS_PER_SECOND: 50,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 100,
  ZOOM_BUTTON_FACTOR: 1.7,
  ZOOM_ANCHOR_PLAYHEAD_THRESHOLD: 0.15,
} as const

// Fixed audio timeline frame rate (no project settings in the audio editor).
export const DEFAULT_FPS = 30

// Height of a single audio track row, plus the gap between rows.
export const TRACK_HEIGHT = 56
export const TRACK_GAP = 4

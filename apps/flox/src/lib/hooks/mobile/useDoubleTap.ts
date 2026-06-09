import { useRef } from 'react'

interface DoubleTapHandler {
  onDoubleTapLeft: () => void
  onDoubleTapRight: () => void
  onSingleTap: () => void
  onSkipContinueLeft: () => void
  onSkipContinueRight: () => void
  isSkipModeActive: boolean
}

/**
 * Handle double-tap gestures on the video surface.
 * Splits the video into left/right zones for skip backward/forward.
 */
export function useDoubleTap({
  onDoubleTapLeft,
  onDoubleTapRight,
  onSingleTap,
  onSkipContinueLeft,
  onSkipContinueRight,
  isSkipModeActive,
}: DoubleTapHandler) {
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | null }>({
    time: 0,
    side: null,
  })
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTap = (e: React.TouchEvent<HTMLVideoElement>) => {
    const currentTime = Date.now()
    const videoElement = e.currentTarget
    const touch = e.touches[0] || e.changedTouches[0]

    if (!touch || !videoElement) return

    // Touch position relative to the video element
    const rect = videoElement.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const width = rect.width
    const side = x < width / 2 ? 'left' : 'right'

    const timeDiff = currentTime - lastTapRef.current.time
    const sameSide = lastTapRef.current.side === side

    // Clear any pending single tap
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current)
      singleTapTimeoutRef.current = null
    }

    // While skip mode is active, single tap continues skipping
    if (isSkipModeActive) {
      if (side === 'left') onSkipContinueLeft()
      else onSkipContinueRight()
      lastTapRef.current = { time: currentTime, side }
      return
    }

    // Double tap detected (within 300ms on the same side)
    if (timeDiff < 300 && sameSide) {
      e.preventDefault()

      if (side === 'left') onDoubleTapLeft()
      else onDoubleTapRight()

      // Reset to prevent triple-tap
      lastTapRef.current = { time: 0, side: null }
    } else {
      // Possible single tap — wait to see if a double tap follows
      lastTapRef.current = { time: currentTime, side }

      singleTapTimeoutRef.current = setTimeout(() => {
        onSingleTap()
        singleTapTimeoutRef.current = null
      }, 300)
    }
  }

  return { handleTap }
}

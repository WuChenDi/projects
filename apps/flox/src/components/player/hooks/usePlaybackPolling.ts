import { useEffect } from 'react'

interface UsePlaybackPollingProps {
  isPlaying: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  isDraggingProgressRef: React.RefObject<boolean>
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
}

/**
 * Polling fallback for AirPlay and throttled events
 * Updates playback progress manually when events are suppressed
 */
export function usePlaybackPolling({
  isPlaying,
  videoRef,
  isDraggingProgressRef,
  setCurrentTime,
  setDuration,
  setIsPlaying,
}: UsePlaybackPollingProps) {
  useEffect(() => {
    if (!videoRef.current) return

    const interval = setInterval(() => {
      if (videoRef.current) {
        // Sync play/pause state (crucial for AirPlay where events might be missed)
        const isVideoPaused = videoRef.current.paused
        if (isVideoPaused === isPlaying && !isDraggingProgressRef.current) {
          // State mismatch detected (e.g. AirPlay paused but app thinks playing)
          setIsPlaying(!isVideoPaused)
        }

        if (!isDraggingProgressRef.current && !isVideoPaused) {
          const current = videoRef.current.currentTime
          const total = videoRef.current.duration

          // Only update if significantly different to avoid jitter
          setCurrentTime(current)
          if (!isNaN(total) && total > 0) {
            setDuration(total)
          }
        }
      }
    }, 500) // Poll every 500ms

    return () => clearInterval(interval)
  }, [
    isPlaying,
    videoRef,
    isDraggingProgressRef,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  ])
}

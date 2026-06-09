'use client'

import { useEffect, useRef } from 'react'

interface UseStallDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  isDraggingProgressRef: React.RefObject<boolean>
  setIsLoading: (loading: boolean) => void
  isTransitioningToNextEpisode: boolean
}

/**
 * Hook to detect if the video is stalled (supposed to be playing but currentTime isn't moving)
 * threshold: 200ms as requested by the user
 */
export function useStallDetection({
  videoRef,
  isPlaying,
  isDraggingProgressRef,
  setIsLoading,
  isTransitioningToNextEpisode,
}: UseStallDetectionProps) {
  const lastTimeRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(Date.now())
  const isStalledByMeRef = useRef<boolean>(false)

  useEffect(() => {
    if (!videoRef.current) return

    const checkStall = () => {
      if (!videoRef.current) return

      const isVideoPaused = videoRef.current.paused
      const currentTime = videoRef.current.currentTime
      const now = Date.now()

      if (
        isPlaying &&
        !isVideoPaused &&
        !isDraggingProgressRef.current &&
        !isTransitioningToNextEpisode
      ) {
        if (currentTime !== lastTimeRef.current) {
          // Time is moving!
          if (isStalledByMeRef.current) {
            setIsLoading(false)
            isStalledByMeRef.current = false
          }
          lastTimeRef.current = currentTime
          lastUpdateTimeRef.current = now
        } else {
          // Time hasn't moved. Check how long it's been.
          const stallDuration = now - lastUpdateTimeRef.current
          if (stallDuration > 200) {
            setIsLoading(true)
            isStalledByMeRef.current = true
          }
        }
      } else {
        // If paused, dragging, or transitioning, reset trackers
        lastTimeRef.current = currentTime
        lastUpdateTimeRef.current = now
        if (isStalledByMeRef.current) {
          setIsLoading(false)
          isStalledByMeRef.current = false
        }
      }
    }

    const interval = setInterval(checkStall, 100)
    return () => {
      clearInterval(interval)
      if (isStalledByMeRef.current) {
        setIsLoading(false)
        isStalledByMeRef.current = false
      }
    }
  }, [
    isPlaying,
    videoRef,
    isDraggingProgressRef,
    setIsLoading,
    isTransitioningToNextEpisode,
  ])
}

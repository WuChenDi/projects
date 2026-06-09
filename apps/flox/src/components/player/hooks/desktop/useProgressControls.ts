import { useCallback, useEffect, useMemo, useRef } from 'react'

interface UseProgressControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  progressBarRef: React.RefObject<HTMLDivElement | null>
  duration: number
  setCurrentTime: (time: number) => void
  isDraggingProgressRef: React.RefObject<boolean>
  isRotated?: boolean
}

export function useProgressControls({
  videoRef,
  progressBarRef,
  duration,
  setCurrentTime,
  isDraggingProgressRef,
  isRotated = false,
}: UseProgressControlsProps) {
  const lastDragTimeRef = useRef<number>(0)

  const getEventPos = useCallback(
    (e: any, rect: DOMRect) => {
      // Handle both mouse and touch events
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0

      if (isRotated) {
        // When rotated 90deg, visual left->right is physical top->bottom
        // The bounding rect height is the visual width of the bar
        return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      } else {
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      }
    },
    [isRotated],
  )

  const handleProgressClick = useCallback(
    (e: any) => {
      if (!videoRef.current || !progressBarRef.current) return
      const rect = progressBarRef.current.getBoundingClientRect()
      const pos = getEventPos(e, rect)
      const newTime = pos * duration
      videoRef.current.currentTime = newTime
      lastDragTimeRef.current = newTime // Update ref to prevent snap-back on mouseup
      setCurrentTime(newTime)
    },
    [videoRef, progressBarRef, duration, setCurrentTime, getEventPos],
  )

  const handleProgressMouseDown = useCallback(
    (e: any) => {
      e.preventDefault()
      isDraggingProgressRef.current = true
      handleProgressClick(e)
    },
    [isDraggingProgressRef, handleProgressClick],
  )

  const handleProgressTouchStart = useCallback(
    (e: any) => {
      e.preventDefault()
      isDraggingProgressRef.current = true
      handleProgressClick(e)
    },
    [isDraggingProgressRef, handleProgressClick],
  )

  useEffect(() => {
    const handleProgressMouseMove = (e: MouseEvent) => {
      if (
        !isDraggingProgressRef.current ||
        !progressBarRef.current ||
        !videoRef.current
      )
        return
      e.preventDefault()
      const rect = progressBarRef.current.getBoundingClientRect()
      const pos = getEventPos(e, rect)
      const newTime = pos * duration
      lastDragTimeRef.current = newTime
      setCurrentTime(newTime)
    }

    const handleMouseUp = () => {
      if (isDraggingProgressRef.current) {
        isDraggingProgressRef.current = false
        if (videoRef.current) {
          videoRef.current.currentTime = lastDragTimeRef.current
        }
      }
    }

    const handleProgressTouchMove = (e: TouchEvent) => {
      if (
        !isDraggingProgressRef.current ||
        !progressBarRef.current ||
        !videoRef.current
      )
        return
      if (e.cancelable) e.preventDefault()

      const rect = progressBarRef.current.getBoundingClientRect()
      const pos = getEventPos(e, rect)
      const newTime = pos * duration
      lastDragTimeRef.current = newTime
      setCurrentTime(newTime)
    }

    const handleTouchEnd = () => {
      if (isDraggingProgressRef.current) {
        isDraggingProgressRef.current = false
        if (videoRef.current) {
          videoRef.current.currentTime = lastDragTimeRef.current
        }
      }
    }

    document.addEventListener('mousemove', handleProgressMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleProgressTouchMove, {
      passive: false,
    })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleProgressMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleProgressTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [
    duration,
    isDraggingProgressRef,
    progressBarRef,
    videoRef,
    setCurrentTime,
    getEventPos,
  ])

  // Attach touchstart with passive: false to allow preventDefault (React uses passive by default)
  useEffect(() => {
    const progressBar = progressBarRef.current
    if (!progressBar) return

    const handleNativeTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      isDraggingProgressRef.current = true
      if (!videoRef.current) return
      const rect = progressBar.getBoundingClientRect()
      const pos = getEventPos(e, rect)
      const newTime = pos * duration
      lastDragTimeRef.current = newTime
      setCurrentTime(newTime)
    }

    progressBar.addEventListener('touchstart', handleNativeTouchStart, {
      passive: false,
    })
    return () => {
      progressBar.removeEventListener('touchstart', handleNativeTouchStart)
    }
  }, [
    progressBarRef,
    videoRef,
    isDraggingProgressRef,
    duration,
    setCurrentTime,
    getEventPos,
  ])

  const progressActions = useMemo(
    () => ({
      handleProgressClick,
      handleProgressMouseDown,
      handleProgressTouchStart,
    }),
    [handleProgressClick, handleProgressMouseDown, handleProgressTouchStart],
  )

  return progressActions
}

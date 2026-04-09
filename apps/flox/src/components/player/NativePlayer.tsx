'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useHlsPlayer } from './hooks/useHlsPlayer'
import type { VideoResolutionInfo } from './hooks/useVideoResolution'
import { useVideoResolution } from './hooks/useVideoResolution'

interface NativePlayerProps {
  src: string
  autoPlay?: boolean
  initialTime?: number
  playbackRate?: number
  skipIntroSeconds?: number // auto-seek past intro on start
  skipOutroSeconds?: number // trigger onEnded N seconds before actual end
  onError?: (message: string) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onResolutionDetected?: (info: VideoResolutionInfo) => void
  className?: string
}

export function NativePlayer({
  src,
  autoPlay = true,
  initialTime = 0,
  playbackRate = 1,
  skipIntroSeconds = 0,
  skipOutroSeconds = 0,
  onError,
  onTimeUpdate,
  onEnded,
  onResolutionDetected,
  className,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const initialTimeApplied = useRef(false)
  const introSkipped = useRef(false)
  const outroTriggered = useRef(false)

  useHlsPlayer({ videoRef, src, autoPlay, onError })
  const resolution = useVideoResolution(videoRef)

  useEffect(() => {
    if (resolution) onResolutionDetected?.(resolution)
  }, [resolution, onResolutionDetected])

  // Apply initial seek
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handle = () => {
      if (!initialTimeApplied.current && initialTime > 0) {
        video.currentTime = initialTime
        initialTimeApplied.current = true
      }
    }
    video.addEventListener('loadedmetadata', handle)
    return () => video.removeEventListener('loadedmetadata', handle)
  }, [initialTime])

  // Playback rate
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
    // Also apply when media loads (rate resets on src change)
    const handle = () => {
      video.playbackRate = playbackRate
    }
    video.addEventListener('loadedmetadata', handle)
    return () => video.removeEventListener('loadedmetadata', handle)
  }, [playbackRate])

  // Reset per-src flags
  // biome-ignore lint/correctness/useExhaustiveDependencies: only mutating refs, src is the correct trigger
  useEffect(() => {
    initialTimeApplied.current = false
    introSkipped.current = false
    outroTriggered.current = false
  }, [src])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const currentTime = video.currentTime
    const duration = video.duration || 0

    // Auto skip intro: jump past intro once on start
    if (
      skipIntroSeconds > 0 &&
      !introSkipped.current &&
      currentTime > 0 &&
      currentTime < skipIntroSeconds
    ) {
      introSkipped.current = true
      video.currentTime = skipIntroSeconds
    }

    // Auto skip outro: fire onEnded early
    if (
      skipOutroSeconds > 0 &&
      duration > 0 &&
      !outroTriggered.current &&
      currentTime >= duration - skipOutroSeconds
    ) {
      outroTriggered.current = true
      onEnded?.()
    }

    onTimeUpdate?.(currentTime, duration)
  }, [skipIntroSeconds, skipOutroSeconds, onTimeUpdate, onEnded])

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      playsInline
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
    />
  )
}

'use client'

import React from 'react'
import { useIsIOS, useIsMobile } from '@/lib/hooks/mobile/useDeviceDetection'
import { useDoubleTap } from '@/lib/hooks/mobile/useDoubleTap'
import { DesktopControlsWrapper } from './desktop/DesktopControlsWrapper'
import { DesktopOverlayWrapper } from './desktop/DesktopOverlayWrapper'
import { useAutoSkip } from './hooks/useAutoSkip'
import { useDesktopPlayerLogic } from './hooks/useDesktopPlayerLogic'
import { useDesktopPlayerState } from './hooks/useDesktopPlayerState'
import { useHlsPlayer } from './hooks/useHlsPlayer'
import { usePlayerSettings } from './hooks/usePlayerSettings'
import { useStallDetection } from './hooks/useStallDetection'
import { useVideoResolution } from './hooks/useVideoResolution'
import './web-fullscreen.css'

interface ViewportMetrics {
  width: number
  height: number
}

type LegacyInlineVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  'webkit-playsinline'?: 'true'
}

const LEGACY_INLINE_VIDEO_PROPS: LegacyInlineVideoProps = {
  'webkit-playsinline': 'true',
}

function readViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  const viewport = window.visualViewport
  return {
    width: Math.round(viewport?.width ?? window.innerWidth ?? 0),
    height: Math.round(viewport?.height ?? window.innerHeight ?? 0),
  }
}

interface DesktopVideoPlayerProps {
  src: string
  poster?: string
  onError?: (error: string) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  initialTime?: number
  shouldAutoPlay?: boolean
  // Episode navigation props for auto-skip/auto-next
  totalEpisodes?: number
  currentEpisodeIndex?: number
  onNextEpisode?: () => void
  isReversed?: boolean
  isPremium?: boolean
  // Resolution callback
  onResolutionDetected?: (
    info: import('./hooks/useVideoResolution').VideoResolutionInfo,
  ) => void
}

export function DesktopVideoPlayer({
  src,
  poster,
  onError,
  onTimeUpdate,
  initialTime = 0,
  shouldAutoPlay = false,
  totalEpisodes = 1,
  currentEpisodeIndex = 0,
  onNextEpisode,
  isReversed = false,
  isPremium = false,
  onResolutionDetected,
}: DesktopVideoPlayerProps) {
  const { refs, data, actions } = useDesktopPlayerState()
  const { fullscreenType, seekStepSeconds } = usePlayerSettings()
  const isIOS = useIsIOS()
  const isMobile = useIsMobile()
  const [viewportMetrics, setViewportMetrics] = React.useState<ViewportMetrics>(
    () => readViewportMetrics(),
  )
  const [fullscreenClock, setFullscreenClock] = React.useState('')

  // Detect actual video resolution
  const videoResolution = useVideoResolution(refs.videoRef)

  // Notify parent when resolution is detected
  React.useEffect(() => {
    if (videoResolution && onResolutionDetected) {
      onResolutionDetected(videoResolution)
    }
  }, [videoResolution, onResolutionDetected])

  // Apply playback rate (controlled externally via the settings store / card)
  React.useEffect(() => {
    if (refs.videoRef.current) {
      refs.videoRef.current.playbackRate = data.playbackRate
    }
  }, [data.playbackRate, refs.videoRef])

  const updateViewportMetrics = React.useCallback(() => {
    setViewportMetrics((current) => {
      const next = readViewportMetrics()
      if (current.width === next.width && current.height === next.height) {
        return current
      }
      return next
    })
  }, [])

  React.useEffect(() => {
    updateViewportMetrics()

    const visualViewport = window.visualViewport
    window.addEventListener('resize', updateViewportMetrics)
    window.addEventListener('orientationchange', updateViewportMetrics)
    visualViewport?.addEventListener('resize', updateViewportMetrics)

    return () => {
      window.removeEventListener('resize', updateViewportMetrics)
      window.removeEventListener('orientationchange', updateViewportMetrics)
      visualViewport?.removeEventListener('resize', updateViewportMetrics)
    }
  }, [updateViewportMetrics])

  const isLandscape = viewportMetrics.width > viewportMetrics.height

  // Check if we need to force landscape (iOS + Fullscreen + Portrait)
  const shouldForceLandscape =
    data.fullscreenMode === 'window' && isIOS && !isLandscape

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on src change
  React.useEffect(() => {
    updateViewportMetrics()

    if (data.fullscreenMode !== 'window') return

    const rafId = window.requestAnimationFrame(updateViewportMetrics)
    const timeoutId = window.setTimeout(updateViewportMetrics, 250)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [data.fullscreenMode, src, updateViewportMetrics])

  React.useEffect(() => {
    if (!data.isFullscreen) {
      setFullscreenClock('')
      return
    }

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const updateClock = () => {
      setFullscreenClock(formatter.format(new Date()))
    }

    updateClock()
    const interval = window.setInterval(updateClock, 30000)
    return () => window.clearInterval(interval)
  }, [data.isFullscreen])

  // Initialize HLS Player
  useHlsPlayer({
    videoRef: refs.videoRef,
    src,
    autoPlay: shouldAutoPlay,
  })

  const { videoRef, containerRef } = refs

  const { isPlaying, currentTime, duration } = data

  const { setShowControls, setBufferedTime, setIsLoading } = actions

  // Reset loading state and show spinner when source changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: must re-run on src change
  React.useEffect(() => {
    setIsLoading(true)
    setBufferedTime(0)
  }, [src, setBufferedTime, setIsLoading])

  const logic = useDesktopPlayerLogic({
    src,
    initialTime,
    shouldAutoPlay,
    onError,
    onTimeUpdate,
    refs,
    data,
    actions,
    fullscreenType,
    isForceLandscape: shouldForceLandscape,
    seekStepSeconds,
  })

  // Auto-skip intro/outro and auto-next episode
  const { isTransitioningToNextEpisode } = useAutoSkip({
    videoRef,
    currentTime,
    duration,
    isPlaying,
    isPremium,
    totalEpisodes,
    currentEpisodeIndex,
    onNextEpisode,
    isReversed,
    src,
  })

  // Sensitive stalling detection (e.g. video stuck but HTML5 state says playing)
  useStallDetection({
    videoRef,
    isPlaying: data.isPlaying,
    isDraggingProgressRef: refs.isDraggingProgressRef,
    setIsLoading: actions.setIsLoading,
    isTransitioningToNextEpisode,
  })

  const {
    handleMouseMove,
    handleTouchToggleControls,
    togglePlay,
    handlePlay,
    handlePause,
    handleTimeUpdateEvent,
    handleLoadedMetadata,
    handleProgressEvent,
    handleVideoError,
  } = logic

  const webFullscreenStyle = React.useMemo<
    React.CSSProperties | undefined
  >(() => {
    if (data.fullscreenMode !== 'window') return undefined
    if (viewportMetrics.width <= 0 || viewportMetrics.height <= 0)
      return undefined

    const stageWidth = shouldForceLandscape
      ? viewportMetrics.height
      : viewportMetrics.width
    const stageHeight = shouldForceLandscape
      ? viewportMetrics.width
      : viewportMetrics.height

    return {
      ['--flox-viewport-width' as string]: `${viewportMetrics.width}px`,
      ['--flox-viewport-height' as string]: `${viewportMetrics.height}px`,
      ['--flox-stage-viewport-width' as string]: `${stageWidth}px`,
      ['--flox-stage-viewport-height' as string]: `${stageHeight}px`,
      ['--flox-web-scale' as string]: '1',
    }
  }, [data.fullscreenMode, shouldForceLandscape, viewportMetrics])

  const stageClassName =
    data.fullscreenMode === 'window'
      ? 'flox-stage flox-web-fullscreen-stage'
      : 'flox-stage absolute inset-0'
  const isTopAlignedWebFullscreen =
    data.fullscreenMode === 'window' &&
    isMobile &&
    !isLandscape &&
    !shouldForceLandscape

  // Mobile double-tap gesture for skip forward/backward
  const { handleTap } = useDoubleTap({
    onSingleTap: handleTouchToggleControls,
    onDoubleTapLeft: () => {
      logic.skipBackward()
      handleMouseMove() // Reset 3s auto-hide timer
    },
    onDoubleTapRight: () => {
      logic.skipForward()
      handleMouseMove() // Reset 3s auto-hide timer
    },
    onSkipContinueLeft: () => {
      logic.skipBackward()
      handleMouseMove()
    },
    onSkipContinueRight: () => {
      logic.skipForward()
      handleMouseMove()
    },
    isSkipModeActive:
      data.showSkipForwardIndicator || data.showSkipBackwardIndicator,
  })

  return (
    <div
      ref={containerRef}
      className={`flox-container relative aspect-video bg-black group ${
        data.fullscreenMode === 'window' ? 'is-web-fullscreen' : ''
      } ${shouldForceLandscape ? 'force-landscape' : ''} ${isTopAlignedWebFullscreen ? 'top-align-stage' : ''} overflow-hidden rounded-none sm:rounded-[var(--radius-2xl)]`}
      style={webFullscreenStyle}
      onMouseMove={() => {
        handleMouseMove()
      }}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div className={stageClassName}>
        {/* Clipping Wrapper for video and overlays - Restores the 'Liquid Glass' rounded look */}
        <div
          className={`absolute inset-0 overflow-hidden pointer-events-none ${
            data.fullscreenMode === 'window'
              ? 'rounded-none'
              : 'rounded-none sm:rounded-[var(--radius-2xl)]'
          }`}
        >
          <div className="absolute inset-0 pointer-events-auto">
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              poster={poster}
              playsInline={true} // Crucial for iOS custom fullscreen to work without native player taking over
              controls={false} // Explicitly disable native controls
              onPlay={handlePlay}
              onPause={handlePause}
              onTimeUpdate={handleTimeUpdateEvent}
              onLoadedMetadata={handleLoadedMetadata}
              onProgress={handleProgressEvent}
              onError={handleVideoError}
              onWaiting={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onClick={
                !isMobile
                  ? () => {
                      togglePlay()
                    }
                  : undefined
              }
              onTouchStart={isMobile ? handleTap : undefined}
              {...LEGACY_INLINE_VIDEO_PROPS} // Legacy iOS support
            />

            <DesktopOverlayWrapper
              data={data}
              showControls={data.showControls}
              isFullscreen={data.isFullscreen}
              fullscreenClock={fullscreenClock}
              onTogglePlay={togglePlay}
              onSkipForward={logic.skipForward}
              onSkipBackward={logic.skipBackward}
              isTransitioningToNextEpisode={isTransitioningToNextEpisode}
              seekStepSeconds={seekStepSeconds}
            />

            <DesktopControlsWrapper
              src={src}
              data={data}
              logic={logic}
              refs={refs}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useMemo } from 'react'
import { DEFAULT_SEEK_STEP_SECONDS } from '@/lib/store/settings-store'
import { getCopyUrl } from '../utils/urlUtils'
import { useControlsVisibility } from './desktop/useControlsVisibility'
import { useDesktopShortcuts } from './desktop/useDesktopShortcuts'
import { useFullscreenControls } from './desktop/useFullscreenControls'
import { usePlaybackControls } from './desktop/usePlaybackControls'
import { useProgressControls } from './desktop/useProgressControls'
import { useSkipControls } from './desktop/useSkipControls'
import { useUtilities } from './desktop/useUtilities'
import { useVolumeControls } from './desktop/useVolumeControls'
import type { useDesktopPlayerState } from './useDesktopPlayerState'

type DesktopPlayerState = ReturnType<typeof useDesktopPlayerState>

interface UseDesktopPlayerLogicProps {
  src: string
  initialTime: number
  shouldAutoPlay: boolean
  onError?: (error: string) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  refs: DesktopPlayerState['refs']
  data: DesktopPlayerState['data']
  actions: DesktopPlayerState['actions']
  fullscreenType?: 'native' | 'window'
  isForceLandscape?: boolean
  seekStepSeconds?: number
}

export function useDesktopPlayerLogic({
  src,
  initialTime,
  shouldAutoPlay,
  onError,
  onTimeUpdate,
  refs,
  data,
  actions,
  fullscreenType = 'native',
  isForceLandscape = false,
  seekStepSeconds = DEFAULT_SEEK_STEP_SECONDS,
}: UseDesktopPlayerLogicProps) {
  const {
    videoRef,
    containerRef,
    progressBarRef,
    volumeBarRef,
    controlsTimeoutRef,
    speedMenuTimeoutRef,
    skipForwardTimeoutRef,
    skipBackwardTimeoutRef,
    volumeBarTimeoutRef,
    isDraggingProgressRef,
    isDraggingVolumeRef,
    mouseMoveThrottleRef,
    toastTimeoutRef,
  } = refs

  const {
    isPlaying,
    duration,
    volume,
    isMuted,
    fullscreenMode,
    showControls,
    playbackRate,
    showSpeedMenu,
    isPiPSupported,
    skipForwardAmount,
    skipBackwardAmount,
    showSkipForwardIndicator,
    showSkipBackwardIndicator,
    showMoreMenu,
  } = data

  const {
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setBufferedTime,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    setFullscreenMode,
    setShowControls,
    setIsLoading,
    setPlaybackRate,
    setShowSpeedMenu,
    setIsPiPSupported,
    setSkipForwardAmount,
    setSkipBackwardAmount,
    setShowSkipForwardIndicator,
    setShowSkipBackwardIndicator,
    setIsSkipForwardAnimatingOut,
    setIsSkipBackwardAnimatingOut,
    setShowVolumeBar,
    setToastMessage,
    setShowToast,
    setShowMoreMenu,
  } = actions

  const playbackControls = usePlaybackControls({
    videoRef,
    isPlaying,
    setIsPlaying,
    setIsLoading,
    initialTime,
    shouldAutoPlay,
    setDuration,
    setBufferedTime,
    setCurrentTime,
    onTimeUpdate,
    onError,
    isDraggingProgressRef,
    speedMenuTimeoutRef,
    playbackRate,
    setPlaybackRate,
    setShowSpeedMenu,
    volume,
    isMuted,
  })

  const volumeControls = useVolumeControls({
    videoRef,
    volumeBarRef,
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    setShowVolumeBar,
    volumeBarTimeoutRef,
    isDraggingVolumeRef,
  })

  const progressControls = useProgressControls({
    videoRef,
    progressBarRef,
    duration,
    setCurrentTime,
    isDraggingProgressRef,
    isRotated: isForceLandscape,
  })

  const skipControls = useSkipControls({
    videoRef,
    duration,
    seekStepSeconds,
    setCurrentTime,
    showSkipForwardIndicator,
    showSkipBackwardIndicator,
    skipForwardAmount,
    skipBackwardAmount,
    setShowSkipForwardIndicator,
    setShowSkipBackwardIndicator,
    setSkipForwardAmount,
    setSkipBackwardAmount,
    setIsSkipForwardAnimatingOut,
    setIsSkipBackwardAnimatingOut,
    skipForwardTimeoutRef,
    skipBackwardTimeoutRef,
  })

  const fullscreenControls = useFullscreenControls({
    containerRef,
    videoRef,
    setIsFullscreen,
    fullscreenMode,
    setFullscreenMode,
    isPiPSupported,
    setIsPiPSupported,
    fullscreenType,
  })

  const controlsVisibility = useControlsVisibility({
    isPlaying,
    showControls,
    showSpeedMenu,
    showMoreMenu,
    setShowControls,
    setShowSpeedMenu,
    setShowMoreMenu,
    controlsTimeoutRef,
    speedMenuTimeoutRef,
    mouseMoveThrottleRef,
  })

  const utilities = useUtilities({
    src,
    setToastMessage,
    setShowToast,
    toastTimeoutRef,
  })

  useDesktopShortcuts({
    videoRef,
    isPlaying,
    volume,
    isPiPSupported,
    togglePlay: playbackControls.togglePlay,
    toggleMute: volumeControls.toggleMute,
    toggleFullscreen: fullscreenControls.toggleFullscreen,
    toggleWindowFullscreen: fullscreenControls.toggleWindowFullscreen,
    togglePictureInPicture: fullscreenControls.togglePictureInPicture,
    skipForward: skipControls.skipForward,
    skipBackward: skipControls.skipBackward,
    showVolumeBarTemporarily: volumeControls.showVolumeBarTemporarily,
    setShowControls,
    setVolume,
    setIsMuted,
    controlsTimeoutRef,
  })

  // Value-based handlers for the shared Slider component (seek + volume)
  const seekPreview = useCallback(
    (time: number) => {
      isDraggingProgressRef.current = true
      setCurrentTime(time)
    },
    [isDraggingProgressRef, setCurrentTime],
  )

  const seekCommit = useCallback(
    (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time
      isDraggingProgressRef.current = false
      setCurrentTime(time)
    },
    [videoRef, isDraggingProgressRef, setCurrentTime],
  )

  const setVolumeValue = useCallback(
    (v: number) => {
      if (videoRef.current) {
        videoRef.current.volume = v
        videoRef.current.muted = v === 0
      }
      setVolume(v)
      setIsMuted(v === 0)
    },
    [videoRef, setVolume, setIsMuted],
  )

  return useMemo(
    () => ({
      seekPreview,
      seekCommit,
      setVolumeValue,
      handleMouseMove: controlsVisibility.handleMouseMove,
      handleTouchToggleControls: controlsVisibility.handleTouchToggleControls,
      togglePlay: playbackControls.togglePlay,
      handlePlay: playbackControls.handlePlay,
      handlePause: playbackControls.handlePause,
      handleTimeUpdateEvent: playbackControls.handleTimeUpdateEvent,
      handleLoadedMetadata: playbackControls.handleLoadedMetadata,
      handleProgressEvent: playbackControls.handleProgressEvent,
      handleVideoError: playbackControls.handleVideoError,
      handleProgressClick: progressControls.handleProgressClick,
      handleProgressMouseDown: progressControls.handleProgressMouseDown,
      handleProgressTouchStart: progressControls.handleProgressTouchStart,
      toggleMute: volumeControls.toggleMute,
      showVolumeBarTemporarily: volumeControls.showVolumeBarTemporarily,
      handleVolumeChange: volumeControls.handleVolumeChange,
      handleVolumeMouseDown: volumeControls.handleVolumeMouseDown,
      toggleFullscreen: fullscreenControls.toggleFullscreen,
      toggleNativeFullscreen: fullscreenControls.toggleNativeFullscreen,
      toggleWindowFullscreen: fullscreenControls.toggleWindowFullscreen,
      togglePictureInPicture: fullscreenControls.togglePictureInPicture,
      skipForward: skipControls.skipForward,
      skipBackward: skipControls.skipBackward,
      changePlaybackSpeed: playbackControls.changePlaybackSpeed,
      handleCopyLink: (type: 'original' | 'proxy' = 'original') => {
        const urlToCopy = getCopyUrl(src, type)
        utilities.handleCopyLink(urlToCopy)
      },
      startSpeedMenuTimeout: controlsVisibility.startSpeedMenuTimeout,
      clearSpeedMenuTimeout: controlsVisibility.clearSpeedMenuTimeout,
      formatTime: playbackControls.formatTime,
    }),
    [
      src,
      seekPreview,
      seekCommit,
      setVolumeValue,
      controlsVisibility,
      playbackControls,
      progressControls,
      volumeControls,
      fullscreenControls,
      skipControls,
      utilities,
    ],
  )
}

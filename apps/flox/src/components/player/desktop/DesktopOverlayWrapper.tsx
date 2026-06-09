import type { useDesktopPlayerState } from '../hooks/useDesktopPlayerState'
import { DesktopOverlay } from './DesktopOverlay'

interface DesktopOverlayWrapperProps {
  data: ReturnType<typeof useDesktopPlayerState>['data']
  showControls: boolean
  isFullscreen: boolean
  fullscreenClock: string
  onTogglePlay: () => void
  onSkipForward: () => void
  onSkipBackward: () => void
  isTransitioningToNextEpisode?: boolean
  seekStepSeconds: number
}

export function DesktopOverlayWrapper({
  data,
  showControls,
  isFullscreen,
  fullscreenClock,
  onTogglePlay,
  onSkipForward,
  onSkipBackward,
  isTransitioningToNextEpisode = false,
  seekStepSeconds,
}: DesktopOverlayWrapperProps) {
  const {
    isLoading,
    isPlaying,
    showSkipForwardIndicator,
    showSkipBackwardIndicator,
    skipForwardAmount,
    skipBackwardAmount,
    isSkipForwardAnimatingOut,
    isSkipBackwardAnimatingOut,
    showToast,
    toastMessage,
  } = data

  return (
    <DesktopOverlay
      isLoading={isLoading}
      isTransitioningToNextEpisode={isTransitioningToNextEpisode}
      isPlaying={isPlaying}
      showSkipForwardIndicator={showSkipForwardIndicator}
      showSkipBackwardIndicator={showSkipBackwardIndicator}
      skipForwardAmount={skipForwardAmount}
      skipBackwardAmount={skipBackwardAmount}
      isSkipForwardAnimatingOut={isSkipForwardAnimatingOut}
      isSkipBackwardAnimatingOut={isSkipBackwardAnimatingOut}
      showToast={showToast}
      toastMessage={toastMessage}
      showControls={showControls}
      isFullscreen={isFullscreen}
      fullscreenClock={fullscreenClock}
      onTogglePlay={onTogglePlay}
      onSkipForward={onSkipForward}
      onSkipBackward={onSkipBackward}
      seekStepSeconds={seekStepSeconds}
    />
  )
}

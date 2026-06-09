import type { useDesktopPlayerLogic } from '../hooks/useDesktopPlayerLogic'
import type { useDesktopPlayerState } from '../hooks/useDesktopPlayerState'
import { DesktopControls } from './DesktopControls'

interface DesktopControlsWrapperProps {
  src: string
  data: ReturnType<typeof useDesktopPlayerState>['data']
  logic: ReturnType<typeof useDesktopPlayerLogic>
  refs: ReturnType<typeof useDesktopPlayerState>['refs']
}

export function DesktopControlsWrapper({
  src,
  data,
  logic,
}: DesktopControlsWrapperProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    bufferedTime,
    volume,
    isMuted,
    isFullscreen,
    fullscreenMode,
    showControls,
    showVolumeBar,
    isPiPSupported,
  } = data

  const {
    togglePlay,
    toggleMute,
    setVolumeValue,
    toggleFullscreen,
    toggleNativeFullscreen,
    toggleWindowFullscreen,
    togglePictureInPicture,
    seekPreview,
    seekCommit,
    formatTime,
  } = logic

  const isProxied = src.includes('/api/proxy')

  return (
    <DesktopControls
      showControls={showControls}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      bufferedTime={bufferedTime}
      volume={volume}
      isMuted={isMuted}
      isFullscreen={isFullscreen}
      isNativeFullscreen={fullscreenMode === 'native'}
      isWebFullscreen={fullscreenMode === 'window'}
      showVolumeBar={showVolumeBar}
      isPiPSupported={isPiPSupported}
      isProxied={isProxied}
      onTogglePlay={togglePlay}
      onToggleMute={toggleMute}
      onVolumeValueChange={setVolumeValue}
      onToggleFullscreen={toggleFullscreen}
      onToggleNativeFullscreen={toggleNativeFullscreen}
      onToggleWebFullscreen={toggleWindowFullscreen}
      onTogglePictureInPicture={togglePictureInPicture}
      onSeekChange={seekPreview}
      onSeekCommit={seekCommit}
      formatTime={formatTime}
    />
  )
}

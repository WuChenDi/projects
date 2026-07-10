import { Button } from '@cdlab/ui/components/button'
import { Check, Clock, FastForward, Play, SkipBack } from 'lucide-react'

interface DesktopOverlayProps {
  isLoading: boolean
  isTransitioningToNextEpisode?: boolean
  isPlaying: boolean
  showSkipForwardIndicator: boolean
  showSkipBackwardIndicator: boolean
  skipForwardAmount: number
  skipBackwardAmount: number
  isSkipForwardAnimatingOut: boolean
  isSkipBackwardAnimatingOut: boolean
  showToast: boolean
  toastMessage: string | null
  showControls: boolean
  isFullscreen: boolean
  fullscreenClock: string
  onTogglePlay: () => void
  onSkipForward: () => void
  onSkipBackward: () => void
  seekStepSeconds: number
}

export function DesktopOverlay({
  isLoading,
  isTransitioningToNextEpisode = false,
  isPlaying,
  showSkipForwardIndicator,
  showSkipBackwardIndicator,
  skipForwardAmount,
  skipBackwardAmount,
  isSkipForwardAnimatingOut,
  isSkipBackwardAnimatingOut,
  showToast,
  toastMessage,
  isFullscreen,
  fullscreenClock,
  onTogglePlay,
  onSkipForward,
  onSkipBackward,
  showControls,
  seekStepSeconds,
}: DesktopOverlayProps) {
  // Show navigation buttons when controls are visible or when paused (controls usually show when paused anyway)
  const showNavButtons = showControls || !isPlaying
  const showFullscreenClock = showControls || !isPlaying

  return (
    <>
      {isFullscreen && fullscreenClock && (
        <div
          className={`absolute top-8 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${showFullscreenClock ? 'opacity-100' : 'opacity-0'}`}
          style={{ pointerEvents: 'none' }}
        >
          <div className="min-w-[88px] px-4 py-2 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-center shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-center gap-2 text-white">
              <Clock size={14} className="opacity-80" />
              <span className="text-sm font-semibold tracking-[0.18em] tabular-nums">
                {fullscreenClock}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner - Glass Effect */}
      {isLoading && (
        <div className="loading-overlay-glass">
          {isTransitioningToNextEpisode ? (
            <div className="next-episode-loading">
              <div className="spinner-glass"></div>
              <span className="next-episode-text">正在自动播放下一集...</span>
            </div>
          ) : (
            <div className="spinner-glass"></div>
          )}
        </div>
      )}

      {/* Skip Backward Indicator (Animation) */}
      {showSkipBackwardIndicator && (
        <div className="absolute top-1/2 left-24 -translate-y-1/2 pointer-events-none transition-all duration-300 z-20">
          <div
            className={`text-white text-3xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              isSkipBackwardAnimatingOut
                ? 'animate-scale-out'
                : 'animate-scale-in'
            }`}
          >
            -{skipBackwardAmount}秒
          </div>
        </div>
      )}

      {/* Skip Forward Indicator (Animation) */}
      {showSkipForwardIndicator && (
        <div className="absolute top-1/2 right-24 -translate-y-1/2 pointer-events-none transition-all duration-300 z-20">
          <div
            className={`text-white text-3xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              isSkipForwardAnimatingOut
                ? 'animate-scale-out'
                : 'animate-scale-in'
            }`}
          >
            +{skipForwardAmount}秒
          </div>
        </div>
      )}

      {/* Previous Button (Method: Skip Backward) */}
      <div
        className={`absolute left-0 top-0 bottom-0 flex items-center justify-center p-4 md:p-8 transition-opacity duration-300 z-10 ${
          showNavButtons ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: showNavButtons ? 'auto' : 'none' }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onSkipBackward()
          }}
          className="group size-10 md:size-16 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label={`后退 ${seekStepSeconds} 秒`}
        >
          <SkipBack className="size-5 md:size-8 text-white/80 group-hover:text-white" />
        </Button>
      </div>

      {/* Next Button (Method: Skip Forward) - Refined to use FastForward icon */}
      <div
        className={`absolute right-0 top-0 bottom-0 flex items-center justify-center p-4 md:p-8 transition-opacity duration-300 z-10 ${
          showNavButtons ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: showNavButtons ? 'auto' : 'none' }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onSkipForward()
          }}
          className="group size-10 md:size-16 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label={`前进 ${seekStepSeconds} 秒`}
        >
          <FastForward className="size-5 md:size-8 text-white/80 group-hover:text-white" />
        </Button>
      </div>

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePlay}
            className="pointer-events-auto size-12 md:size-20 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="播放"
          >
            <Play className="size-6 md:size-10 text-white" />
          </Button>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && toastMessage && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
          <div className="bg-[rgba(28,28,30,0.95)] backdrop-blur-[25px] rounded-[var(--radius-2xl)] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-6 py-3 flex items-center gap-3 min-w-[200px]">
            <Check size={18} className="text-[#34c759] flex-shrink-0" />
            <span className="text-white text-sm font-medium">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

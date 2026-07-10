import { Button } from '@cdlab/ui/components/button'
import { Maximize, Minimize, PictureInPicture, Target } from 'lucide-react'

interface DesktopRightControlsProps {
  isNativeFullscreen: boolean
  isWebFullscreen: boolean
  isPiPSupported: boolean
  onToggleNativeFullscreen: () => void
  onToggleWebFullscreen: () => void
  onTogglePictureInPicture: () => void
}

const ICON_BUTTON_CLASS = 'text-white/90 hover:text-white hover:bg-white/10'

export function DesktopRightControls({
  isNativeFullscreen,
  isWebFullscreen,
  isPiPSupported,
  onToggleNativeFullscreen,
  onToggleWebFullscreen,
  onTogglePictureInPicture,
}: DesktopRightControlsProps) {
  return (
    <div className="relative z-50 flex items-center gap-3">
      {/* Picture-in-Picture */}
      {isPiPSupported && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onTogglePictureInPicture}
          className={ICON_BUTTON_CLASS}
          aria-label="画中画"
          title="画中画"
        >
          <PictureInPicture className="size-5" />
        </Button>
      )}

      {/* Web Fullscreen */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleWebFullscreen}
        className={ICON_BUTTON_CLASS}
        aria-label={isWebFullscreen ? '退出网页全屏' : '网页全屏'}
        title={isWebFullscreen ? '退出网页全屏 (W)' : '网页全屏 (W)'}
      >
        <Target
          className={isWebFullscreen ? 'size-5 text-primary' : 'size-5'}
        />
      </Button>

      {/* Native Fullscreen */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleNativeFullscreen}
        className={ICON_BUTTON_CLASS}
        aria-label={isNativeFullscreen ? '退出系统全屏' : '系统全屏'}
        title={isNativeFullscreen ? '退出系统全屏 (F)' : '系统全屏 (F)'}
      >
        {isNativeFullscreen ? (
          <Minimize className="size-5" />
        ) : (
          <Maximize className="size-5" />
        )}
      </Button>
    </div>
  )
}

import { Button } from '@cdlab996/ui/components/button'
import { Pause, Play } from 'lucide-react'
import { DesktopVolumeControl } from './DesktopVolumeControl'

interface DesktopLeftControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  showVolumeBar: boolean
  onTogglePlay: () => void
  onToggleMute: () => void
  onVolumeValueChange: (v: number) => void
  formatTime: (seconds: number) => string
}

export function DesktopLeftControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  showVolumeBar,
  onTogglePlay,
  onToggleMute,
  onVolumeValueChange,
  formatTime,
}: DesktopLeftControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Play/Pause */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onTogglePlay}
        className="text-white/90 hover:text-white hover:bg-white/10"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
      </Button>

      {/* Volume */}
      <DesktopVolumeControl
        volume={volume}
        isMuted={isMuted}
        showVolumeBar={showVolumeBar}
        onToggleMute={onToggleMute}
        onVolumeValueChange={onVolumeValueChange}
      />

      {/* Time */}
      <span className="text-white text-sm font-medium tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

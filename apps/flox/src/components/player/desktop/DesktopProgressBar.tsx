import { Slider } from '@cdlab/ui/components/slider'

interface DesktopProgressBarProps {
  currentTime: number
  duration: number
  onSeekChange: (time: number) => void
  onSeekCommit: (time: number) => void
}

export function DesktopProgressBar({
  currentTime,
  duration,
  onSeekChange,
  onSeekCommit,
}: DesktopProgressBarProps) {
  const max = duration > 0 ? duration : 100
  return (
    <div className="px-4 pb-1">
      <Slider
        value={[Math.min(currentTime, max)]}
        min={0}
        max={max}
        step={0.1}
        onValueChange={(v) => onSeekChange(v[0])}
        onValueCommit={(v) => onSeekCommit(v[0])}
        aria-label="播放进度"
      />
    </div>
  )
}

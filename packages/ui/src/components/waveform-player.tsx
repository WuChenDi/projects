'use client'

import { Pause, Play } from 'lucide-react'
import * as React from 'react'
import { AudioWaveform } from '@cdlab996/ui/components/audio-waveform'
import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'

interface WaveformPlayerProps {
  /**
   * Audio blob to play and visualize. Takes precedence over `url`.
   */
  blob?: Blob
  /**
   * Audio URL to play and visualize.
   */
  url?: string
  /**
   * Width of the visualizer. Defaults to the container width.
   */
  width?: number
  /**
   * Height of the visualizer. Default: `84`
   */
  height?: number
  /**
   * Width of each individual bar. Default: `2`
   */
  barWidth?: number
  /**
   * Gap between each bar. Default: `1`
   */
  gap?: number
  /**
   * Color of the bars that have not yet been played.
   */
  barColor?: string
  /**
   * Color of the bars that have been played. Default: `"rgb(34, 197, 94)"`
   */
  barPlayedColor?: string
  /**
   * Additional CSS classes for the wrapper.
   */
  className?: string
  /**
   * Called whenever playback starts or stops.
   */
  onPlayStateChange?: (playing: boolean) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function WaveformPlayer({
  blob,
  url,
  width,
  height = 84,
  barWidth = 2,
  gap = 1,
  barColor,
  barPlayedColor = 'rgb(34, 197, 94)',
  className,
  onPlayStateChange,
}: WaveformPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const seekRef = React.useRef<HTMLDivElement | null>(null)
  const draggingRef = React.useRef(false)
  const onPlayStateChangeRef = React.useRef(onPlayStateChange)
  onPlayStateChangeRef.current = onPlayStateChange
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)

  React.useEffect(() => {
    if (!blob && !url) return

    const objectUrl = blob ? URL.createObjectURL(blob) : null
    const audioUrl = objectUrl ?? url

    if (!audioUrl) return

    const audio = new Audio(audioUrl)

    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onPlayStateChangeRef.current?.(false)
    }

    audioRef.current = audio

    return () => {
      audio.pause()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      audioRef.current = null
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [blob, url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    } else {
      void audio.play()
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }
  }

  // Click or drag across the visualizer to seek to that position.
  const seekToClientX = (clientX: number) => {
    const el = seekRef.current
    const audio = audioRef.current
    if (!el || !audio || !duration) return
    const rect = el.getBoundingClientRect()
    const fraction = Math.min(
      Math.max((clientX - rect.left) / rect.width, 0),
      1,
    )
    const time = fraction * duration
    audio.currentTime = time
    setCurrentTime(time)
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-lg w-full',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="size-9 rounded-full shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>

        <div
          ref={seekRef}
          className="relative cursor-pointer"
          style={{ width: width ?? '100%' }}
          onPointerDown={(e) => {
            draggingRef.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            seekToClientX(e.clientX)
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) seekToClientX(e.clientX)
          }}
          onPointerUp={(e) => {
            draggingRef.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
          }}
        >
          <AudioWaveform
            blob={blob}
            audioUrl={blob ? undefined : url}
            width={width}
            height={height}
            barWidth={barWidth}
            gap={gap}
            barColor={barColor}
            barPlayedColor={barPlayedColor}
            progress={duration > 0 ? currentTime / duration : 0}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground pl-12 px-0.5 select-none">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export type { WaveformPlayerProps }
export { WaveformPlayer }

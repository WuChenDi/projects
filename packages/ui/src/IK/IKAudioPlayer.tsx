'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IKAudioVisualizer } from './IKAudioVisualizer'

interface IKAudioPlayerProps {
  blob: Blob
  width?: number
  height?: number
  barWidth?: number
  gap?: number
  barColor?: string
  barPlayedColor?: string
  className?: string
  onPlayStateChange?: (playing: boolean) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function IKAudioPlayer({
  blob,
  width,
  height = 84,
  barWidth = 2,
  gap = 1,
  barColor,
  barPlayedColor = 'rgb(34, 197, 94)',
  className,
  onPlayStateChange,
}: IKAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  onPlayStateChangeRef.current = onPlayStateChange
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)

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
      URL.revokeObjectURL(url)
      audioRef.current = null
    }
  }, [blob])

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

        <IKAudioVisualizer
          blob={blob}
          width={width}
          height={height}
          barWidth={barWidth}
          gap={gap}
          backgroundColor="transparent"
          barColor={barColor}
          barPlayedColor={barPlayedColor}
          currentTime={currentTime}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground pl-12 px-0.5 select-none">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

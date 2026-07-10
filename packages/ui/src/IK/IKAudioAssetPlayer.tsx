'use client'

import { cn } from '@cdlab/ui/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

interface IKAudioAssetPlayerProps {
  audioUrl: string
  className?: string
  onClick?: () => void
}

export function IKAudioAssetPlayer({
  audioUrl,
  className,
  onClick,
}: IKAudioAssetPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleMouseEnter = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
    setIsPlaying(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [])

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <img
        src="/images/audio/base.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover select-none"
        draggable={false}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'relative w-full h-full',
            isPlaying && 'animate-[spin_5s_linear_infinite]',
          )}
        >
          <img
            src="/images/audio/record.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      <img
        src="/images/audio/pointer.webp"
        alt=""
        className={cn(
          'absolute inset-0 w-full h-full object-contain origin-[75%_8%] transition-transform duration-500 select-none',
          isPlaying ? 'rotate-[5deg]' : 'rotate-0',
        )}
        draggable={false}
      />
    </div>
  )
}

'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ChevronLeftIcon, CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

interface VideoPlayerErrorProps {
  error: string
  onBack: () => void
  onRetry: () => void
  retryCount: number
  maxRetries: number
}

export function VideoPlayerError({
  error,
  onBack,
  onRetry,
  retryCount,
  maxRetries,
}: VideoPlayerErrorProps) {
  return (
    <div className="aspect-video bg-black rounded-2xl flex items-center justify-center">
      {/* Glass Card Container */}
      <div
        className="player-error-glass animate-in fade-in zoom-in-95 duration-300"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {/* Glowing Error Icon */}
        <div className="relative">
          <CircleAlertIcon size={56} className="error-icon mx-auto mb-4" />
          {/* Glow effect */}
          <div className="absolute inset-0 blur-xl bg-red-500/30 rounded-full -z-10" />
        </div>

        <h3>播放失败</h3>
        <p>{error}</p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Button type="button" variant="secondary" onClick={onBack}>
            <ChevronLeftIcon />
            <span>返回</span>
          </Button>
          {retryCount < maxRetries && (
            <Button type="button" onClick={onRetry}>
              <RefreshCwIcon />
              <span>
                重试 ({retryCount}/{maxRetries})
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

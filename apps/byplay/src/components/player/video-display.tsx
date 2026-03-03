'use client'

import type { RefObject } from 'react'

interface VideoDisplayProps {
  videoRef: RefObject<HTMLVideoElement | null>
}

export function VideoDisplay({ videoRef }: VideoDisplayProps) {
  return (
    <div className="bg-background rounded-xl overflow-hidden h-full">
      <video
        ref={videoRef}
        id="videoElement"
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
      >
        您的浏览器不支持 HTML5 视频播放
      </video>
    </div>
  )
}

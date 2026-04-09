import { useEffect, useState } from 'react'

function getResolutionLabel(
  width: number,
  height: number,
): { label: string; color: string } | null {
  if (width === 0 || height === 0) return null
  const h = Math.max(width, height) === width ? height : width
  if (h >= 2160) return { label: '4K', color: 'bg-amber-500' }
  if (h >= 1440) return { label: '2K', color: 'bg-emerald-500' }
  if (h >= 1080) return { label: '1080P', color: 'bg-green-500' }
  if (h >= 720) return { label: '720P', color: 'bg-teal-500' }
  if (h >= 480) return { label: '480P', color: 'bg-sky-500' }
  if (h >= 360) return { label: '360P', color: 'bg-gray-500' }
  return { label: `${h}P`, color: 'bg-gray-500' }
}

export interface VideoResolutionInfo {
  width: number
  height: number
  label: string
  color: string
}

export function useVideoResolution(
  videoRef: React.RefObject<HTMLVideoElement | null>,
): VideoResolutionInfo | null {
  const [resolution, setResolution] = useState<VideoResolutionInfo | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const detectResolution = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w > 0 && h > 0) {
        const info = getResolutionLabel(w, h)
        if (info) setResolution({ width: w, height: h, ...info })
      }
    }

    video.addEventListener('loadedmetadata', detectResolution)
    video.addEventListener('resize', detectResolution)
    if (video.videoWidth > 0 && video.videoHeight > 0) detectResolution()

    return () => {
      video.removeEventListener('loadedmetadata', detectResolution)
      video.removeEventListener('resize', detectResolution)
    }
  }, [videoRef])

  return resolution
}

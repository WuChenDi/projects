import { useCallback } from 'react'
import { TIMELINE_CONSTANTS } from '@/editor/constants'
import type { AudioTrack } from '@/editor/types'

// Clip-edge + playhead snapping. Ported verbatim from bycut's
// use-timeline-snapping, retyped to the audio track/clip model.

export interface SnapPoint {
  time: number
  type: 'clip-start' | 'clip-end' | 'playhead'
  clipId?: string
  trackId?: string
}

export interface SnapResult {
  snappedTime: number
  snapPoint: SnapPoint | null
  snapDistance: number
}

interface UseTimelineSnappingOptions {
  snapThreshold?: number
}

export function useTimelineSnapping({
  snapThreshold = 10,
}: UseTimelineSnappingOptions = {}) {
  const findSnapPoints = useCallback(
    ({
      tracks,
      playheadTime,
      excludeClipId,
    }: {
      tracks: AudioTrack[]
      playheadTime: number
      excludeClipId?: string
    }): SnapPoint[] => {
      const snapPoints: SnapPoint[] = []

      for (const track of tracks) {
        for (const clip of track.clips) {
          if (clip.id === excludeClipId) continue
          const clipStart = clip.startTime
          const clipEnd = clip.startTime + clip.duration
          snapPoints.push(
            {
              time: clipStart,
              type: 'clip-start',
              clipId: clip.id,
              trackId: track.id,
            },
            {
              time: clipEnd,
              type: 'clip-end',
              clipId: clip.id,
              trackId: track.id,
            },
          )
        }
      }

      snapPoints.push({ time: playheadTime, type: 'playhead' })
      return snapPoints
    },
    [],
  )

  const snapToNearestPoint = useCallback(
    ({
      targetTime,
      snapPoints,
      zoomLevel,
    }: {
      targetTime: number
      snapPoints: SnapPoint[]
      zoomLevel: number
    }): SnapResult => {
      const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
      const thresholdInSeconds = snapThreshold / pixelsPerSecond

      let closestSnapPoint: SnapPoint | null = null
      let closestDistance = Infinity

      for (const snapPoint of snapPoints) {
        const distance = Math.abs(targetTime - snapPoint.time)
        if (distance < thresholdInSeconds && distance < closestDistance) {
          closestDistance = distance
          closestSnapPoint = snapPoint
        }
      }

      return {
        snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
        snapPoint: closestSnapPoint,
        snapDistance: closestDistance,
      }
    },
    [snapThreshold],
  )

  const snapClipEdge = useCallback(
    ({
      targetTime,
      clipDuration,
      tracks,
      playheadTime,
      zoomLevel,
      excludeClipId,
      snapToStart = true,
    }: {
      targetTime: number
      clipDuration: number
      tracks: AudioTrack[]
      playheadTime: number
      zoomLevel: number
      excludeClipId?: string
      snapToStart?: boolean
    }): SnapResult => {
      const snapPoints = findSnapPoints({
        tracks,
        playheadTime,
        excludeClipId,
      })

      const effectiveTargetTime = snapToStart
        ? targetTime
        : targetTime + clipDuration
      const snapResult = snapToNearestPoint({
        targetTime: effectiveTargetTime,
        snapPoints,
        zoomLevel,
      })

      if (!snapToStart && snapResult.snapPoint) {
        snapResult.snappedTime = snapResult.snappedTime - clipDuration
      }

      return snapResult
    },
    [findSnapPoints, snapToNearestPoint],
  )

  return { snapClipEdge, findSnapPoints, snapToNearestPoint }
}

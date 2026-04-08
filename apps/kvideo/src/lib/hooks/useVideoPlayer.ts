'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { settingsStore } from '@/lib/store/settings-store'

interface VideoData {
  vod_id: string
  vod_name: string
  vod_pic?: string
  vod_content?: string
  vod_actor?: string
  vod_director?: string
  vod_year?: string
  vod_area?: string
  type_name?: string
  episodes?: Array<{ name?: string; url: string }>
}

interface UseVideoPlayerReturn {
  videoData: VideoData | null
  loading: boolean
  videoError: string
  currentEpisode: number
  playUrl: string
  setCurrentEpisode: (index: number) => void
  setPlayUrl: (url: string) => void
  setVideoError: (error: string) => void
  fetchVideoDetails: () => void
}

async function fetchVideoDetail(videoId: string, source: string): Promise<VideoData> {
  const settings = settingsStore.getSettings()
  const allSources = [...settings.sources, ...settings.premiumSources, ...settings.subscriptions]
  const sourceConfig = allSources.find((s) => s.id === source)

  const response = sourceConfig
    ? await fetch('/api/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId, source: sourceConfig }),
      })
    : await fetch(`/api/detail?id=${videoId}&source=${source}`)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  if (!data.success || !data.data) {
    throw new Error(data.error || '来自 API 的响应无效')
  }
  if (!data.data.episodes?.length) {
    throw new Error('该来源没有可播放的剧集')
  }

  return data.data as VideoData
}

export function useVideoPlayer(
  videoId: string | null,
  source: string | null,
  episodeParam: string | null,
  isReversed = false,
): UseVideoPlayerReturn {
  const [currentEpisode, setCurrentEpisode] = useState(0)
  const [playUrl, setPlayUrl] = useState('')

  const {
    data: videoData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['videoDetail', videoId, source],
    queryFn: () => fetchVideoDetail(videoId!, source!),
    enabled: !!(videoId && source),
    staleTime: 5 * 60 * 1000,
  })

  // Reset UI state when video/source changes
  useEffect(() => {
    setCurrentEpisode(0)
    setPlayUrl('')
  }, [videoId, source])

  // Set initial episode when data first arrives
  useEffect(() => {
    if (!videoData?.episodes?.length) return
    const defaultIndex = isReversed ? videoData.episodes.length - 1 : 0
    const ep = episodeParam !== null ? parseInt(episodeParam, 10) : NaN
    const validIndex =
      !isNaN(ep) && ep >= 0 && ep < videoData.episodes.length ? ep : defaultIndex
    setCurrentEpisode(validIndex)
    setPlayUrl(videoData.episodes[validIndex].url)
  }, [videoData]) // intentionally omit isReversed/episodeParam — only fires on initial load

  // Sync episode index when URL param changes (back/forward navigation)
  useEffect(() => {
    if (!videoData?.episodes || episodeParam === null) return
    const index = parseInt(episodeParam, 10)
    if (
      !isNaN(index) &&
      index >= 0 &&
      index < videoData.episodes.length &&
      index !== currentEpisode
    ) {
      setCurrentEpisode(index)
      setPlayUrl(videoData.episodes[index].url)
    }
  }, [episodeParam, videoData]) // intentionally omit currentEpisode

  return {
    videoData: videoData ?? null,
    loading: isLoading,
    videoError: error instanceof Error ? error.message : '',
    currentEpisode,
    playUrl,
    setCurrentEpisode,
    setPlayUrl,
    setVideoError: () => {}, // kept for call-site compat; error is managed by useQuery
    fetchVideoDetails: refetch,
  }
}

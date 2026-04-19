'use client'

import { Tabs, TabsList, TabsTrigger } from '@cdlab996/ui/components/tabs'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { EpisodeList } from '@/components/player/EpisodeList'
import type { VideoResolutionInfo } from '@/components/player/hooks/useVideoResolution'
import { PlayerError } from '@/components/player/PlayerError'
import type { SourceInfo } from '@/components/player/SourceSelector'
import { SourceSelector } from '@/components/player/SourceSelector'
import { VideoMetadata } from '@/components/player/VideoMetadata'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { useResolutionProbe } from '@/lib/hooks/useResolutionProbe'
import { useVideoPlayer } from '@/lib/hooks/useVideoPlayer'
import { useHistory } from '@/lib/store/history-store'
import { settingsStore } from '@/lib/store/settings-store'

type PlayerViewportMode = 'standard' | 'wide' | 'cinema'
const VIEWPORT_MODE_KEY = 'flox-player-viewport-mode'

function PlayerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isPremium = searchParams.get('premium') === '1'
  const { addToHistory } = useHistory(isPremium)

  const videoId = searchParams.get('id')
  const source = searchParams.get('source')
  const title = searchParams.get('title')
  const episodeParam = searchParams.get('episode')
  const groupedSourcesParam = searchParams.get('groupedSources')

  const [isReversed, setIsReversed] = useState(() =>
    typeof window !== 'undefined'
      ? settingsStore.getSettings().episodeReverseOrder
      : false,
  )
  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'sources'>(
    'episodes',
  )
  const [viewportMode, setViewportMode] = useState<PlayerViewportMode>(() => {
    if (typeof window === 'undefined') return 'standard'
    const saved = localStorage.getItem(VIEWPORT_MODE_KEY)
    return saved === 'wide' || saved === 'cinema' ? saved : 'standard'
  })
  const playerTimeRef = useRef(0)
  const [detectedResolution, setDetectedResolution] =
    useState<VideoResolutionInfo | null>(null)
  const [currentSourceId, setCurrentSourceId] = useState(source)

  useEffect(() => {
    setIsReversed(settingsStore.getSettings().episodeReverseOrder)
  }, [])

  useEffect(() => {
    localStorage.setItem(VIEWPORT_MODE_KEY, viewportMode)
  }, [viewportMode])

  // Redirect if params missing — must be after all hooks
  useEffect(() => {
    if (!videoId || !source) router.push('/')
  }, [videoId, source, router])

  const {
    videoData,
    loading,
    videoError,
    currentEpisode,
    playUrl,
    setCurrentEpisode,
    setPlayUrl,
    setVideoError,
    fetchVideoDetails,
  } = useVideoPlayer(videoId, source, episodeParam, isReversed)

  const groupedSources = useMemo<SourceInfo[]>(() => {
    let sources: SourceInfo[] = []
    if (groupedSourcesParam) {
      try {
        sources = JSON.parse(groupedSourcesParam)
      } catch {
        sources = []
      }
    }
    if (source && !sources.find((s) => s.source === source)) {
      sources.unshift({
        id: videoId || '',
        source,
        sourceName: source,
        pic: videoData?.vod_pic,
      })
    }
    return sources
  }, [groupedSourcesParam, source, videoId, videoData?.vod_pic])

  const probeList = useMemo(
    () => groupedSources.map((s) => ({ id: s.id, source: s.source })),
    [groupedSources],
  )
  const { resolutions: sourceResolutions } = useResolutionProbe(probeList)

  const playerGridClass =
    viewportMode === 'cinema'
      ? 'lg:grid-cols-[minmax(0,1.9fr)_minmax(260px,0.55fr)]'
      : viewportMode === 'wide'
        ? 'lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.72fr)]'
        : 'lg:grid-cols-3'

  useEffect(() => {
    if (videoData && playUrl && videoId) {
      const mappedEpisodes =
        videoData.episodes?.map((ep, idx) => ({
          name: ep.name || `第${idx + 1}集`,
          url: ep.url,
          index: idx,
        })) || []
      addToHistory(
        videoId,
        videoData.vod_name || title || '未知视频',
        playUrl,
        currentEpisode,
        source || '',
        0,
        0,
        videoData.vod_pic,
        mappedEpisodes,
      )
    }
  }, [videoData, playUrl, videoId, currentEpisode, source, title, addToHistory])

  const handleEpisodeClick = useCallback(
    (episode: any, index: number) => {
      setCurrentEpisode(index)
      setPlayUrl(episode.url)
      setVideoError('')
      const params = new URLSearchParams(searchParams.toString())
      params.set('episode', index.toString())
      router.replace(`/player?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, setCurrentEpisode, setPlayUrl, setVideoError],
  )

  const handleToggleReverse = (reversed: boolean) => {
    setIsReversed(reversed)
    const settings = settingsStore.getSettings()
    settingsStore.saveSettings({ ...settings, episodeReverseOrder: reversed })
  }

  const handleNextEpisode = useCallback(() => {
    const episodes = videoData?.episodes
    if (!episodes) return
    let nextIndex: number
    if (!isReversed) {
      if (currentEpisode >= episodes.length - 1) return
      nextIndex = currentEpisode + 1
    } else {
      if (currentEpisode <= 0) return
      nextIndex = currentEpisode - 1
    }
    const nextEpisode = episodes[nextIndex]
    if (nextEpisode) handleEpisodeClick(nextEpisode, nextIndex)
  }, [videoData, currentEpisode, isReversed, handleEpisodeClick])

  const hasMultipleSources = groupedSources.length > 1

  const handleSourceChange = useCallback(
    (newSource: SourceInfo) => {
      const params = new URLSearchParams()
      params.set('id', String(newSource.id))
      params.set('source', newSource.source)
      params.set('title', title || '')
      params.set('episode', currentEpisode.toString())
      if (playerTimeRef.current > 1) {
        params.set('t', Math.floor(playerTimeRef.current).toString())
      }
      if (groupedSourcesParam) params.set('groupedSources', groupedSourcesParam)
      if (isPremium) params.set('premium', '1')
      setCurrentSourceId(newSource.source)
      router.replace(`/player?${params.toString()}`, { scroll: false })
    },
    [title, currentEpisode, groupedSourcesParam, isPremium, router],
  )

  const sourceSelectorProps = {
    sources: groupedSources,
    currentSource: currentSourceId || source || '',
    onSourceChange: handleSourceChange,
    currentResolution: detectedResolution,
    sourceResolutions,
  }

  const sidebarContent = (
    <>
      <EpisodeList
        episodes={videoData?.episodes || null}
        currentEpisode={currentEpisode}
        isReversed={isReversed}
        onEpisodeClick={handleEpisodeClick}
        onToggleReverse={handleToggleReverse}
        scrollHeight={hasMultipleSources ? '400px' : '640px'}
      />
      {hasMultipleSources && <SourceSelector {...sourceSelectorProps} />}
    </>
  )

  if (!videoId || !source) return null

  return (
    <IKPageContainer>
      <div className="max-w-7xl mx-auto w-full pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">正在加载视频详情...</p>
          </div>
        ) : videoError && !videoData ? (
          <PlayerError
            error={videoError}
            onBack={() => router.back()}
            onRetry={fetchVideoDetails}
          />
        ) : (
          <div className={`grid gap-4 items-start ${playerGridClass}`}>
            {/* Left column */}
            <div className="lg:col-span-2 space-y-4">
              <VideoPlayer
                playUrl={playUrl}
                poster={videoData?.vod_pic}
                videoId={videoId || undefined}
                currentEpisode={currentEpisode}
                onBack={() => router.back()}
                totalEpisodes={videoData?.episodes?.length || 0}
                onNextEpisode={handleNextEpisode}
                isReversed={isReversed}
                isPremium={isPremium}
                externalTimeRef={playerTimeRef}
                onResolutionDetected={setDetectedResolution}
                viewportMode={viewportMode}
                onViewportModeChange={setViewportMode}
              />

              {/* Mobile tabs */}
              <div className="lg:hidden space-y-4">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                >
                  <TabsList>
                    <TabsTrigger value="episodes">选集</TabsTrigger>
                    <TabsTrigger value="info">简介</TabsTrigger>
                    {hasMultipleSources && (
                      <TabsTrigger value="sources">来源</TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
                {activeTab === 'episodes' && (
                  <EpisodeList
                    episodes={videoData?.episodes || null}
                    currentEpisode={currentEpisode}
                    isReversed={isReversed}
                    onEpisodeClick={handleEpisodeClick}
                    onToggleReverse={handleToggleReverse}
                  />
                )}
                {activeTab === 'info' && (
                  <VideoMetadata
                    videoData={videoData}
                    source={source}
                    title={title}
                    videoId={videoId}
                    isPremium={isPremium}
                  />
                )}
                {activeTab === 'sources' && hasMultipleSources && (
                  <SourceSelector {...sourceSelectorProps} />
                )}
              </div>

              {/* Desktop metadata */}
              <div className="hidden lg:block">
                <VideoMetadata
                  videoData={videoData}
                  source={source}
                  title={title}
                  videoId={videoId}
                  isPremium={isPremium}
                />
              </div>
            </div>

            {/* Right column — sticky, top-aligned */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-[88px] space-y-4">
                {sidebarContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </IKPageContainer>
  )
}

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  )
}

'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Card, CardContent, CardFooter } from '@cdlab996/ui/components/card'
import { Label } from '@cdlab996/ui/components/label'
import { Switch } from '@cdlab996/ui/components/switch'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cdlab996/ui/components/toggle-group'
import { cn } from '@cdlab996/ui/lib/utils'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from '@/lib/store/history-store'
import type { AdFilterMode } from '@/lib/store/settings-store'
import { usePlayerSettings } from './hooks/usePlayerSettings'
import { NativePlayer } from './NativePlayer'
import { VideoPlayerEmpty } from './VideoPlayerEmpty'
import { VideoPlayerError } from './VideoPlayerError'

interface VideoPlayerProps {
  playUrl: string
  poster?: string
  videoId?: string
  currentEpisode: number
  onBack: () => void
  totalEpisodes?: number
  onNextEpisode?: () => void
  isPremium?: boolean
  externalTimeRef?: React.RefObject<number>
  onResolutionDetected?: (
    info: import('./hooks/useVideoResolution').VideoResolutionInfo,
  ) => void
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const AD_FILTER_OPTIONS: { value: AdFilterMode; label: string }[] = [
  { value: 'off', label: '关' },
  { value: 'heuristic', label: '启发' },
  { value: 'aggressive', label: '激进' },
]

const SKIP_PRESETS = [15, 30, 45, 60, 90, 120]

export function VideoPlayer({
  playUrl,
  poster,
  videoId,
  currentEpisode,
  onBack,
  totalEpisodes,
  onNextEpisode,
  isPremium = false,
  externalTimeRef,
  onResolutionDetected,
}: VideoPlayerProps) {
  const [videoError, setVideoError] = useState<string>('')
  const [useProxy, setUseProxy] = useState(false)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [resolution, setResolution] = useState<
    import('./hooks/useVideoResolution').VideoResolutionInfo | null
  >(null)
  const MAX_MANUAL_RETRIES = 20
  const lastSaveTimeRef = useRef(0)
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const SAVE_INTERVAL = 5000

  const {
    proxyMode,
    autoNextEpisode,
    setAutoNextEpisode,
    autoSkipIntro,
    setAutoSkipIntro,
    skipIntroSeconds,
    setSkipIntroSeconds,
    autoSkipOutro,
    setAutoSkipOutro,
    skipOutroSeconds,
    setSkipOutroSeconds,
    adFilterMode,
    setAdFilterMode,
  } = usePlayerSettings()

  // Sync useProxy with global proxyMode setting
  useEffect(() => {
    if (proxyMode === 'always') setUseProxy(true)
    else if (proxyMode === 'none') setUseProxy(false)
  }, [proxyMode])

  const { viewingHistory, addToHistory } = useHistory(isPremium)
  const searchParams = useSearchParams()
  const source = searchParams.get('source') || ''
  const title = searchParams.get('title') || '未知视频'

  const getSavedProgress = () => {
    // Check for explicit time param (from seamless source switch)
    const timeParam = searchParams.get('t')
    if (timeParam) {
      const t = parseFloat(timeParam)
      if (t > 0 && isFinite(t)) return t
    }

    if (!videoId) return 0
    return (
      viewingHistory.find(
        (item) =>
          item.videoId.toString() === videoId.toString() &&
          item.episodeIndex === currentEpisode &&
          (source ? item.source === source : true),
      )?.playbackPosition ||
      viewingHistory.find(
        (item) =>
          item.videoId.toString() === videoId.toString() &&
          item.episodeIndex === currentEpisode,
      )?.playbackPosition ||
      0
    )
  }

  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!videoId || !playUrl || duration === 0 || currentTime <= 1) return
      addToHistory(
        videoId,
        title,
        playUrl,
        currentEpisode,
        source,
        currentTime,
        duration,
        undefined,
        [],
      )
    },
    [videoId, playUrl, title, currentEpisode, source, addToHistory],
  )

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      currentTimeRef.current = currentTime
      durationRef.current = duration
      if (externalTimeRef) externalTimeRef.current = currentTime
      if (!videoId || !playUrl || duration === 0) return
      const now = Date.now()
      if (currentTime > 1 && now - lastSaveTimeRef.current >= SAVE_INTERVAL) {
        lastSaveTimeRef.current = now
        saveProgress(currentTime, duration)
      }
    },
    [videoId, playUrl, saveProgress, externalTimeRef],
  )

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 1 && durationRef.current > 0) {
        saveProgress(currentTimeRef.current, durationRef.current)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveProgress])

  const handleVideoError = (error: string) => {
    if (!useProxy && proxyMode === 'retry') {
      setUseProxy(true)
      setShouldAutoPlay(true)
      setVideoError('')
      return
    }
    setVideoError(error)
  }

  const handleRetry = () => {
    if (retryCount >= MAX_MANUAL_RETRIES) return
    setRetryCount((prev) => prev + 1)
    setVideoError('')
    setShouldAutoPlay(true)
    setUseProxy((prev) => !prev)
  }

  const toggleProxy = () => {
    setUseProxy((prev) => !prev)
    setVideoError('')
    setRetryCount(0)
  }

  const cycleSkipSeconds = (current: number, setter: (v: number) => void) => {
    const next =
      SKIP_PRESETS[(SKIP_PRESETS.indexOf(current) + 1) % SKIP_PRESETS.length]
    setter(next ?? 30)
  }

  const finalPlayUrl =
    useProxy || proxyMode === 'always'
      ? `/api/proxy?url=${encodeURIComponent(playUrl)}&retry=${retryCount}`
      : playUrl

  if (!playUrl) return <VideoPlayerEmpty />

  const hasMultipleEpisodes = (totalEpisodes ?? 0) > 1
  const canToggleProxy = proxyMode === 'retry'

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="relative aspect-video bg-black overflow-hidden">
          {videoError ? (
            <VideoPlayerError
              error={videoError}
              onBack={onBack}
              onRetry={handleRetry}
              retryCount={retryCount}
              maxRetries={MAX_MANUAL_RETRIES}
            />
          ) : (
            <NativePlayer
              key={`${finalPlayUrl}-${retryCount}`}
              src={finalPlayUrl}
              poster={poster}
              autoPlay={shouldAutoPlay}
              initialTime={getSavedProgress()}
              playbackRate={playbackRate}
              skipIntroSeconds={autoSkipIntro ? skipIntroSeconds : 0}
              skipOutroSeconds={autoSkipOutro ? skipOutroSeconds : 0}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              onEnded={autoNextEpisode ? onNextEpisode : undefined}
              onResolutionDetected={(info) => {
                setResolution(info)
                onResolutionDetected?.(info)
              }}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-normal text-muted-foreground whitespace-nowrap">
              速度
            </Label>
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={String(playbackRate)}
              onValueChange={(v) => v && setPlaybackRate(Number(v))}
              aria-label="播放速度"
              className="w-max flex-nowrap flex-1"
            >
              {SPEED_OPTIONS.map((s) => (
                <ToggleGroupItem key={s} value={String(s)} aria-label={`${s}x`}>
                  {s === 1 ? '1x' : `${s}x`}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {(resolution || canToggleProxy) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {resolution && (
                  <Badge className={cn('hidden sm:block', resolution.color)}>
                    {resolution.label}
                  </Badge>
                )}
                {canToggleProxy && (
                  <Badge
                    variant={useProxy ? 'destructive' : 'secondary'}
                    onClick={toggleProxy}
                    className="cursor-pointer select-none"
                  >
                    {useProxy ? '代理' : '直连'}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                广告过滤
              </Label>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={adFilterMode}
                onValueChange={(v) => v && setAdFilterMode(v as AdFilterMode)}
                aria-label="广告过滤"
              >
                {AD_FILTER_OPTIONS.map(({ value, label }) => (
                  <ToggleGroupItem key={value} value={value}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {hasMultipleEpisodes && (
              <div className="flex items-center gap-1.5">
                <Switch
                  id="autoplay-next"
                  checked={autoNextEpisode}
                  onCheckedChange={setAutoNextEpisode}
                />
                <Label
                  htmlFor="autoplay-next"
                  className="cursor-pointer text-xs whitespace-nowrap"
                >
                  自动播放
                </Label>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Switch
                id="skip-intro"
                checked={autoSkipIntro}
                onCheckedChange={setAutoSkipIntro}
              />
              <Label
                htmlFor="skip-intro"
                className="cursor-pointer text-xs whitespace-nowrap"
              >
                跳片头
              </Label>
              {autoSkipIntro && (
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 tabular-nums text-left"
                  onClick={() =>
                    cycleSkipSeconds(skipIntroSeconds, setSkipIntroSeconds)
                  }
                  title="点击切换秒数"
                >
                  {skipIntroSeconds}s
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Switch
                id="skip-outro"
                checked={autoSkipOutro}
                onCheckedChange={setAutoSkipOutro}
              />
              <Label
                htmlFor="skip-outro"
                className="cursor-pointer text-xs whitespace-nowrap"
              >
                跳片尾
              </Label>
              {autoSkipOutro && (
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 tabular-nums text-left"
                  onClick={() =>
                    cycleSkipSeconds(skipOutroSeconds, setSkipOutroSeconds)
                  }
                  title="点击切换秒数"
                >
                  {skipOutroSeconds}s
                </button>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

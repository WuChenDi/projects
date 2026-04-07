'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent } from '@cdlab996/ui/components/card'
import { Separator } from '@cdlab996/ui/components/separator'
import { Switch } from '@cdlab996/ui/components/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { copyToClipboard } from '@cdlab996/utils'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from '@/lib/store/history-store'
import { KVideoPlayer } from '../KVideoPlayer'
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
  isReversed?: boolean
  isPremium?: boolean
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function VideoPlayer({
  playUrl,
  poster,
  videoId,
  currentEpisode,
  onBack,
  totalEpisodes,
  onNextEpisode,
  isReversed = false,
  isPremium = false,
}: VideoPlayerProps) {
  const [videoError, setVideoError] = useState<string>('')
  const [useProxy, setUseProxy] = useState(false)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [copied, setCopied] = useState(false)
  const MAX_MANUAL_RETRIES = 20
  const lastSaveTimeRef = useRef(0)
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const SAVE_INTERVAL = 5000

  const {
    proxyMode,
    playerEngine,
    setPlayerEngine,
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
      if (!videoId || !playUrl || duration === 0) return
      const now = Date.now()
      if (currentTime > 1 && now - lastSaveTimeRef.current >= SAVE_INTERVAL) {
        lastSaveTimeRef.current = now
        saveProgress(currentTime, duration)
      }
    },
    [videoId, playUrl, saveProgress],
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

  const switchEngine = (engine: typeof playerEngine) => {
    setPlayerEngine(engine)
    setVideoError('')
  }

  const toggleProxy = () => {
    setUseProxy((prev) => !prev)
    setVideoError('')
    setRetryCount(0)
  }

  const copyPlayUrl = async () => {
    const ok = await copyToClipboard(playUrl)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const cycleSkipSeconds = (current: number, setter: (v: number) => void) => {
    const presets = [15, 30, 45, 60, 90, 120]
    const next = presets[(presets.indexOf(current) + 1) % presets.length]
    setter(next ?? 30)
  }

  const finalPlayUrl =
    useProxy || proxyMode === 'always'
      ? `/api/proxy?url=${encodeURIComponent(playUrl)}&retry=${retryCount}`
      : playUrl

  if (!playUrl) return <VideoPlayerEmpty />

  const hasMultipleEpisodes = (totalEpisodes ?? 0) > 1
  const canToggleProxy = proxyMode === 'retry'
  const isNative = playerEngine === 'native'
  const adFilterEnabled = adFilterMode !== 'off'

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="relative aspect-video bg-black">
          {playerEngine === 'veplayer' ? (
            <KVideoPlayer
              url={finalPlayUrl}
              autoplay
              poster={poster}
              className="w-full h-full object-contain"
            />
          ) : videoError ? (
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
              autoPlay={shouldAutoPlay}
              initialTime={getSavedProgress()}
              playbackRate={playbackRate}
              skipIntroSeconds={autoSkipIntro ? skipIntroSeconds : 0}
              skipOutroSeconds={autoSkipOutro ? skipOutroSeconds : 0}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              onEnded={autoNextEpisode ? onNextEpisode : undefined}
              className="w-full h-full"
            />
          )}
        </div>
      </Card>

      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                播放器
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={!isNative ? 'default' : 'outline'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => switchEngine('veplayer')}
                >
                  VePlayer
                </Button>
                <Button
                  size="sm"
                  variant={isNative ? 'default' : 'outline'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => switchEngine('native')}
                >
                  原生
                </Button>
              </div>
            </div>

            {isNative && (
              <>
                <Separator
                  orientation="vertical"
                  className="h-5 hidden sm:block"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">
                    速度
                  </span>
                  <div className="flex gap-1">
                    {SPEED_OPTIONS.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={playbackRate === s ? 'default' : 'outline'}
                        className="h-7 text-xs px-2"
                        onClick={() => setPlaybackRate(s)}
                      >
                        {s === 1 ? '1x' : `${s}x`}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              {canToggleProxy && (
                <Badge
                  variant="outline"
                  onClick={toggleProxy}
                  className={`cursor-pointer text-xs select-none transition-colors ${
                    useProxy
                      ? 'border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950'
                      : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
                  }`}
                >
                  {useProxy ? '代理模式' : '直连模式'}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={copyPlayUrl}
                    aria-label="复制播放地址"
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5 text-green-500" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? '已复制' : '复制播放地址'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {hasMultipleEpisodes && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <Switch
                  checked={autoNextEpisode}
                  onCheckedChange={setAutoNextEpisode}
                />
                <span className="text-xs text-muted-foreground">自动连播</span>
              </label>
            )}

            <div className="flex items-center gap-1.5">
              <Switch
                checked={autoSkipIntro}
                onCheckedChange={setAutoSkipIntro}
              />
              <span className="text-xs text-muted-foreground">跳片头</span>
              {autoSkipIntro && (
                <button
                  className="text-xs text-primary underline underline-offset-2 tabular-nums"
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
                checked={autoSkipOutro}
                onCheckedChange={setAutoSkipOutro}
              />
              <span className="text-xs text-muted-foreground">跳片尾</span>
              {autoSkipOutro && (
                <button
                  className="text-xs text-primary underline underline-offset-2 tabular-nums"
                  onClick={() =>
                    cycleSkipSeconds(skipOutroSeconds, setSkipOutroSeconds)
                  }
                  title="点击切换秒数"
                >
                  {skipOutroSeconds}s
                </button>
              )}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Switch
                checked={adFilterEnabled}
                onCheckedChange={(v) =>
                  setAdFilterMode(v ? 'heuristic' : 'off')
                }
              />
              <span className="text-xs text-muted-foreground">广告过滤</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Card, CardContent } from '@cdlab996/ui/components/card'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { IKPageContainer } from '@cdlab996/ui/IK'
import type { Locale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import {
  AbrCard,
  BufferCard,
  EventLogsCard,
  LoadingRetryCard,
  PerformanceCard,
  PlaybackCard,
  SourceCard,
  StatsCard,
} from '@/components/player'
import type { HlsConfig } from '@/hooks/use-hls-player'
import { DEFAULT_HLS_CONFIG, useHlsPlayer } from '@/hooks/use-hls-player'

const VIDEO_EXTENSIONS = [
  '.m3u8',
  '.m3u',
  '.mp4',
  '.webm',
  '.ogg',
  '.ts',
  '.mpd',
]
const DEFAULT_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

function isVideoUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    return VIDEO_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))
  } catch {
    return false
  }
}

type Props = {
  params: Promise<{ locale: Locale }>
}

export default function HlsPage({ params }: Props) {
  const t = useTranslations('video')
  const [url, setUrl] = useState(DEFAULT_URL)
  const [config, setConfig] = useState<HlsConfig>({ ...DEFAULT_HLS_CONFIG })
  const [playbackRate, setPlaybackRate] = useState(1)

  const {
    videoRef,
    state,
    logs,
    loadSource,
    setLevel,
    setPlaybackRate: applyRate,
    clearLogs,
  } = useHlsPlayer()

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally load only on mount when valid param exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url') || params.get('source')
    if (paramUrl && isVideoUrl(paramUrl)) {
      setUrl(paramUrl)
      loadSource(paramUrl, config)
    }
  }, [])

  const updateConfig = useCallback(
    <K extends keyof HlsConfig>(key: K, value: HlsConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleLoad = useCallback(() => {
    if (url.trim()) loadSource(url.trim(), config)
  }, [url, config, loadSource])

  const handleRateChange = useCallback(
    (rate: number) => {
      setPlaybackRate(rate)
      applyRate(rate)
    },
    [applyRate],
  )

  const handleResetConfig = useCallback(() => {
    setConfig({ ...DEFAULT_HLS_CONFIG })
  }, [])

  return (
    <IKPageContainer
      scrollable={false}
      className="flex-1 grid gap-4 lg:grid-cols-[clamp(380px,35%,520px)_1fr]"
    >
      <ScrollArea className="order-2 lg:order-1 lg:h-[calc(100dvh-170px)]">
        <div className="space-y-4 pb-4">
          <SourceCard
            url={url}
            isLoading={state.isLoading}
            onUrlChange={setUrl}
            onLoad={handleLoad}
          />
          <PlaybackCard
            config={config}
            playbackRate={playbackRate}
            state={state}
            onUpdateConfig={updateConfig}
            onRateChange={handleRateChange}
            onResetConfig={handleResetConfig}
            onSetLevel={setLevel}
          />
          <PerformanceCard config={config} onUpdateConfig={updateConfig} />
          <BufferCard config={config} onUpdateConfig={updateConfig} />
          <AbrCard config={config} onUpdateConfig={updateConfig} />
          <LoadingRetryCard config={config} onUpdateConfig={updateConfig} />
        </div>
      </ScrollArea>

      <div className="order-1 lg:order-2 flex flex-col gap-4 lg:h-[calc(100dvh-170px)] lg:overflow-y-auto">
        <div className="bg-background rounded-xl overflow-hidden flex-1 min-h-0">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            playsInline
          >
            {t('notSupported')}
          </video>
        </div>

        {state.error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive text-sm">{state.error}</p>
            </CardContent>
          </Card>
        )}

        <StatsCard state={state} />
        <EventLogsCard logs={logs} onClear={clearLogs} />
      </div>
    </IKPageContainer>
  )
}

'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { Slider } from '@cdlab996/ui/components/slider'
import { Switch } from '@cdlab996/ui/components/switch'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import type { HlsConfig, HlsLogEntry } from '@/hooks/use-hls-player'
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

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatBitrate(bitrate: number): string {
  if (bitrate >= 1_000_000) return `${(bitrate / 1_000_000).toFixed(1)} Mbps`
  return `${Math.round(bitrate / 1000)} Kbps`
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <Field orientation="vertical">
      <div className="flex justify-between">
        <FieldTitle>{label}</FieldTitle>
        <span className="text-muted-foreground text-sm tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </Field>
  )
}

function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  )
}

function LogBadge({ type }: { type: HlsLogEntry['type'] }) {
  const variant =
    type === 'error' ? 'destructive' : type === 'warn' ? 'outline' : 'secondary'
  return (
    <Badge variant={variant} className="text-[10px] px-1 py-0 font-mono">
      {type.toUpperCase()}
    </Badge>
  )
}

function PageContent() {
  const searchParams = useSearchParams()
  const paramUrl = searchParams.get('url')
  const [url, setUrl] = useState(
    paramUrl && isVideoUrl(paramUrl) ? paramUrl : DEFAULT_URL,
  )
  const [config, setConfig] = useState<HlsConfig>({ ...DEFAULT_HLS_CONFIG })
  const [playbackRate, setPlaybackRate] = useState(1)

  const hasValidParam = !!(paramUrl && isVideoUrl(paramUrl))

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
    if (hasValidParam) {
      loadSource(url, config)
    }
  }, [])

  const updateConfig = useCallback(
    <K extends keyof HlsConfig>(key: K, value: HlsConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleLoad = () => {
    if (url.trim()) loadSource(url.trim(), config)
  }

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    applyRate(rate)
  }

  const handleResetConfig = () => {
    setConfig({ ...DEFAULT_HLS_CONFIG })
  }

  return (
    <IKPageContainer
      scrollable={false}
      className="flex-1 grid gap-4 lg:grid-cols-[clamp(380px,35%,520px)_1fr]"
    >
      <ScrollArea className="order-2 lg:order-1 lg:h-[calc(100dvh-170px)]">
        <div className="space-y-4 pb-4">
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
              <CardDescription>
                Enter a M3U8 / HLS stream URL to start playback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field orientation="vertical">
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/stream.m3u8"
                    onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleLoad}
                    disabled={state.isLoading || !url.trim()}
                  >
                    {state.isLoading ? 'Loading...' : 'Load'}
                  </Button>
                </div>
              </Field>
            </CardContent>
          </Card>

          {/* Playback Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Playback</CardTitle>
              <CardAction>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResetConfig}
                >
                  Reset Config
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SwitchField
                  label="Auto Play"
                  description="Load after auto play video"
                  checked={config.autoPlay}
                  onCheckedChange={(v) => updateConfig('autoPlay', v)}
                />

                <Field orientation="vertical">
                  <FieldTitle>Playback Rate</FieldTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAYBACK_RATES.map((rate) => (
                      <Button
                        key={rate}
                        variant={playbackRate === rate ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleRateChange(rate)}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </Field>

                {state.levels.length > 0 && (
                  <Field orientation="vertical">
                    <FieldTitle>Quality Level</FieldTitle>
                    <FieldDescription>
                      {state.levels.length} level(s) available, &quot;Auto&quot;
                      for adaptive bitrate
                    </FieldDescription>
                    <Select
                      value={String(state.currentLevel)}
                      onValueChange={(val) => setLevel(Number(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">Auto</SelectItem>
                        {state.levels.map((level, i) => (
                          <SelectItem
                            key={`${level.height}-${level.bitrate}`}
                            value={String(i)}
                          >
                            {level.height}p - {formatBitrate(level.bitrate)}
                            {level.codec ? ` (${level.codec})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Performance Config */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SwitchField
                  label="Enable Worker"
                  description="Use Web Worker for transmuxing"
                  checked={config.enableWorker}
                  onCheckedChange={(v) => updateConfig('enableWorker', v)}
                />
                <SwitchField
                  label="Low Latency Mode"
                  description="Optimize for low-latency live streams"
                  checked={config.lowLatencyMode}
                  onCheckedChange={(v) => updateConfig('lowLatencyMode', v)}
                />
                <SwitchField
                  label="Start Frag Prefetch"
                  description="Prefetch next fragment during loading"
                  checked={config.startFragPrefetch}
                  onCheckedChange={(v) => updateConfig('startFragPrefetch', v)}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Buffer Config */}
          <Card>
            <CardHeader>
              <CardTitle>Buffer</CardTitle>
              <CardDescription>
                Buffer size and duration settings (apply on next load)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SliderField
                  label="Max Buffer Length"
                  description="Maximum buffer length in seconds"
                  value={config.maxBufferLength}
                  min={5}
                  max={120}
                  step={5}
                  unit="s"
                  onChange={(v) => updateConfig('maxBufferLength', v)}
                />
                <SliderField
                  label="Max Max Buffer Length"
                  description="Absolute maximum buffer length cap"
                  value={config.maxMaxBufferLength}
                  min={30}
                  max={600}
                  step={10}
                  unit="s"
                  onChange={(v) => updateConfig('maxMaxBufferLength', v)}
                />
                <SliderField
                  label="Max Buffer Size"
                  description="Maximum buffer size in memory"
                  value={config.maxBufferSize / (1000 * 1000)}
                  min={10}
                  max={200}
                  step={10}
                  unit=" MB"
                  onChange={(v) =>
                    updateConfig('maxBufferSize', v * 1000 * 1000)
                  }
                />
                <SliderField
                  label="Max Buffer Hole"
                  description="Maximum gap allowed in buffer"
                  value={config.maxBufferHole}
                  min={0.1}
                  max={2}
                  step={0.1}
                  unit="s"
                  onChange={(v) => updateConfig('maxBufferHole', v)}
                />
                <SliderField
                  label="Back Buffer Length"
                  description="Keep played content in buffer"
                  value={config.backBufferLength}
                  min={0}
                  max={120}
                  step={5}
                  unit="s"
                  onChange={(v) => updateConfig('backBufferLength', v)}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          {/* ABR Config */}
          <Card>
            <CardHeader>
              <CardTitle>ABR (Adaptive Bitrate)</CardTitle>
              <CardDescription>
                Bandwidth estimation and quality switching (apply on next load)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SliderField
                  label="Default Bandwidth Estimate"
                  description="Initial bandwidth estimate before measurement"
                  value={config.abrEwmaDefaultEstimate / 1000}
                  min={100}
                  max={5000}
                  step={100}
                  unit=" Kbps"
                  onChange={(v) =>
                    updateConfig('abrEwmaDefaultEstimate', v * 1000)
                  }
                />
                <SliderField
                  label="ABR Bandwidth Factor (Down)"
                  description="Safety factor for quality downgrade"
                  value={config.abrBandWidthFactor}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onChange={(v) => updateConfig('abrBandWidthFactor', v)}
                />
                <SliderField
                  label="ABR Bandwidth Factor (Up)"
                  description="Safety factor for quality upgrade"
                  value={config.abrBandWidthUpFactor}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onChange={(v) => updateConfig('abrBandWidthUpFactor', v)}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Loading & Retry Config */}
          <Card>
            <CardHeader>
              <CardTitle>Loading & Retry</CardTitle>
              <CardDescription>
                Timeout and retry settings (apply on next load)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SliderField
                  label="Fragment Load Timeout"
                  description="Timeout for each video fragment"
                  value={config.fragLoadingTimeOut / 1000}
                  min={5}
                  max={60}
                  step={1}
                  unit="s"
                  onChange={(v) => updateConfig('fragLoadingTimeOut', v * 1000)}
                />
                <SliderField
                  label="Manifest Load Timeout"
                  description="Timeout for playlist manifest"
                  value={config.manifestLoadingTimeOut / 1000}
                  min={5}
                  max={60}
                  step={1}
                  unit="s"
                  onChange={(v) =>
                    updateConfig('manifestLoadingTimeOut', v * 1000)
                  }
                />
                <SliderField
                  label="Level Load Timeout"
                  description="Timeout for level/variant playlist"
                  value={config.levelLoadingTimeOut / 1000}
                  min={5}
                  max={60}
                  step={1}
                  unit="s"
                  onChange={(v) =>
                    updateConfig('levelLoadingTimeOut', v * 1000)
                  }
                />
                <SliderField
                  label="Fragment Max Retry"
                  description="Max retries for failed fragments"
                  value={config.fragLoadingMaxRetry}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => updateConfig('fragLoadingMaxRetry', v)}
                />
                <SliderField
                  label="Manifest Max Retry"
                  description="Max retries for failed manifest"
                  value={config.manifestLoadingMaxRetry}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(v) => updateConfig('manifestLoadingMaxRetry', v)}
                />
                <SliderField
                  label="Level Max Retry"
                  description="Max retries for failed level playlist"
                  value={config.levelLoadingMaxRetry}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(v) => updateConfig('levelLoadingMaxRetry', v)}
                />
                <SliderField
                  label="Fragment Retry Delay"
                  description="Delay between fragment retries"
                  value={config.fragLoadingRetryDelay}
                  min={500}
                  max={10000}
                  step={500}
                  unit="ms"
                  onChange={(v) => updateConfig('fragLoadingRetryDelay', v)}
                />
              </FieldGroup>
            </CardContent>
          </Card>
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
            Your browser does not support HTML5 video
          </video>
        </div>

        {state.error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive text-sm">{state.error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-3">
              <Field orientation="horizontal">
                <FieldTitle>Status</FieldTitle>
                <Badge variant={state.isPlaying ? 'default' : 'secondary'}>
                  {state.isPlaying ? 'Playing' : 'Paused'}
                </Badge>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>HLS.js</FieldTitle>
                <Badge variant={state.isSupported ? 'default' : 'destructive'}>
                  {state.isSupported ? 'Supported' : 'Not Supported'}
                </Badge>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Time</FieldTitle>
                <span className="text-sm tabular-nums">
                  {formatTime(state.currentTime)} / {formatTime(state.duration)}
                </span>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Buffered</FieldTitle>
                <span className="text-sm tabular-nums">
                  {formatTime(state.buffered)}
                </span>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Bandwidth</FieldTitle>
                <span className="text-sm tabular-nums">
                  {state.bandwidth > 0 ? formatBitrate(state.bandwidth) : '--'}
                </span>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Dropped Frames</FieldTitle>
                <span className="text-sm tabular-nums">
                  {state.droppedFrames}
                </span>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Levels</FieldTitle>
                <span className="text-sm tabular-nums">
                  {state.levels.length}
                </span>
              </Field>
              <Field orientation="horizontal">
                <FieldTitle>Current Level</FieldTitle>
                <span className="text-sm tabular-nums">
                  {state.currentLevel === -1 ? 'Auto' : state.currentLevel}
                </span>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Event Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Logs</CardTitle>
            <CardAction>
              <Button variant="secondary" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              {logs.length === 0 ? (
                <IKEmpty
                  title="No Events"
                  description="Load a video to see HLS events"
                  showIcon={false}
                />
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, i) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                      key={`${log.time}-${log.event}-${i}`}
                      className="flex items-start gap-2 py-0.5"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {log.time}
                      </span>
                      <LogBadge type={log.type} />
                      <span className="text-muted-foreground shrink-0">
                        {log.event}
                      </span>
                      <span className="break-all">{log.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </IKPageContainer>
  )
}

export default function HlsPage() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  )
}

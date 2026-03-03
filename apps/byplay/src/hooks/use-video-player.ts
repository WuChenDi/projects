'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VPlayerInstance, VPlayerSource } from '@/types/vplayer'

const DEFAULT_URLS = `https://media.w3.org/2010/05/sintel/trailer.mp4
https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8
https://devstreaming-cdn.apple.com/videos/streaming/examples/adv_dv_atmos/main.m3u8
https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv`

export interface HlsLoadPolicyConfig {
  levelLoadingTimeOut: string
  levelLoadingMaxRetry: string
  levelLoadingRetryDelay: string
  levelLoadingMaxRetryTimeout: string
  manifestLoadingTimeOut: string
  manifestLoadingMaxRetry: string
  manifestLoadingRetryDelay: string
  manifestLoadingMaxRetryTimeout: string
  fragLoadingTimeOut: string
  fragLoadingMaxRetry: string
  fragLoadingRetryDelay: string
  fragLoadingMaxRetryTimeout: string
}

export interface FlvLowLatencyConfig {
  enable: boolean
  maxTargetBufferToPlay: string
  minTargetBufferToPlay: string
  expectedAdjustmentTime: string
  maxPlaybackRate: string
  minIntervalTimeFromNormalToAccelerated: string
  minPeriodTimeOfMaxCountOfAcceleration: string
  maxCountOfAccelerationInPeriodTime: string
}

export interface HlsLowLatencyConfig {
  enable: boolean
  tsCheckWindowInit: string
  tsCheckWindowMax: string
  tsCheckWindowStep: string
  maxPlaybackRate: string
  minPlaybackRate: string
  slowDownloadToNowThreshold: string
}

const DEFAULT_HLS_LOAD_POLICY: HlsLoadPolicyConfig = {
  levelLoadingTimeOut: '3000',
  levelLoadingMaxRetry: '3',
  levelLoadingRetryDelay: '1000',
  levelLoadingMaxRetryTimeout: '2000',
  manifestLoadingTimeOut: '3000',
  manifestLoadingMaxRetry: '3',
  manifestLoadingRetryDelay: '1000',
  manifestLoadingMaxRetryTimeout: '2000',
  fragLoadingTimeOut: '3000',
  fragLoadingMaxRetry: '3',
  fragLoadingRetryDelay: '1000',
  fragLoadingMaxRetryTimeout: '2000',
}

const DEFAULT_FLV_LOW_LATENCY: FlvLowLatencyConfig = {
  enable: true,
  maxTargetBufferToPlay: '6',
  minTargetBufferToPlay: '3',
  expectedAdjustmentTime: '30',
  maxPlaybackRate: '1.05',
  minIntervalTimeFromNormalToAccelerated: '300',
  minPeriodTimeOfMaxCountOfAcceleration: '1800',
  maxCountOfAccelerationInPeriodTime: '3',
}

const DEFAULT_HLS_LOW_LATENCY: HlsLowLatencyConfig = {
  enable: true,
  tsCheckWindowInit: '3',
  tsCheckWindowMax: '10',
  tsCheckWindowStep: '1',
  maxPlaybackRate: '1.05',
  minPlaybackRate: '0.95',
  slowDownloadToNowThreshold: '10',
}

function parseUrls(text: string): VPlayerSource[] {
  const sources: VPlayerSource[] = []
  if (!text.trim()) return sources

  const urls = text.includes('\n') ? text.split('\n') : [text]

  for (const url of urls) {
    const trimmed = url.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('webrtc')) {
      sources.push({ type: 'webrtc', src: trimmed })
      continue
    }
    if (trimmed.startsWith('artc')) {
      sources.push({ type: 'artc', src: trimmed })
      continue
    }
    if (trimmed.startsWith('hrtc')) {
      sources.push({
        type: 'hrtc',
        src: trimmed.replace('hrtc://', 'webrtc://'),
      })
      continue
    }
    if (trimmed.startsWith('rte')) {
      sources.push({ type: 'agora-rte', src: trimmed })
      continue
    }

    try {
      const urlObj = new URL(trimmed)
      const pos = urlObj.pathname.lastIndexOf('.')
      if (pos < 0 || pos === urlObj.pathname.length - 1) continue

      const ext = urlObj.pathname.substring(pos + 1)
      let type = 'native'
      switch (ext) {
        case 'm3u8':
          type = 'hls'
          break
        case 'flv':
          type = 'flv'
          break
        case 'mp4':
          type = 'native'
          break
        case 'sdp':
          type = 'vertc'
          break
        case 'whep':
          type = 'qnrtc'
          break
      }
      sources.push({ type, src: trimmed })
      if (type === 'hls') {
        sources.push({ type: 'native', src: trimmed })
      }
    } catch {
      // invalid URL, skip
    }
  }

  return sources
}

function getSearchParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

function buildHlsLowLatencyPlaybackRatePolicyConfigs() {
  return {
    stable: [
      { tsDurationRange: [0, 1], highWaterMark: 5, lowWaterMark: 3 },
      { tsDurationRange: [1, 2], highWaterMark: 5, lowWaterMark: 3 },
      { tsDurationRange: [2, 3], highWaterMark: 4, lowWaterMark: 2 },
      {
        tsDurationRange: [3, Number.POSITIVE_INFINITY],
        highWaterMark: 4,
        lowWaterMark: 2,
      },
    ],
    unstable: [
      { tsDurationRange: [0, 1], highWaterMark: 6, lowWaterMark: 4 },
      { tsDurationRange: [1, 2], highWaterMark: 6, lowWaterMark: 4 },
      { tsDurationRange: [2, 3], highWaterMark: 6, lowWaterMark: 4 },
      {
        tsDurationRange: [3, Number.POSITIVE_INFINITY],
        highWaterMark: 5,
        lowWaterMark: 3,
      },
    ],
  }
}

export function useVideoPlayer() {
  const playerRef = useRef<VPlayerInstance | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [urls, setUrls] = useState(DEFAULT_URLS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const [restartTimeout, setRestartTimeout] = useState('10000')
  const [speed, setSpeed] = useState('')
  const [seekTime, setSeekTime] = useState('')

  const [hlsLoadPolicy, setHlsLoadPolicy] = useState<HlsLoadPolicyConfig>(
    DEFAULT_HLS_LOAD_POLICY,
  )
  const [flvLowLatency, setFlvLowLatency] = useState<FlvLowLatencyConfig>(
    DEFAULT_FLV_LOW_LATENCY,
  )
  const [hlsLowLatency, setHlsLowLatency] = useState<HlsLowLatencyConfig>(
    DEFAULT_HLS_LOW_LATENCY,
  )

  // Check for URL params on mount
  useEffect(() => {
    const playurl = getSearchParam('playurl')
    if (playurl) {
      setUrls(playurl)
    }
  }, [])

  // Check if vplayer script is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.vplayer) {
      setIsScriptReady(true)
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const onScriptReady = useCallback(() => {
    setIsScriptReady(true)

    // Auto-load if configured via URL params
    const autoload = getSearchParam('autoload')
    if (autoload === 'true') {
      // Defer to next tick so state is settled
      setTimeout(() => {
        loadPlayer()
      }, 0)
    }
  }, [])

  const loadPlayer = useCallback(() => {
    if (!window.vplayer) return

    const sources = parseUrls(urls)
    if (sources.length === 0) return

    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    const autoplay = getSearchParam('autoplay') === 'true'
    const isLiveParam = getSearchParam('isLive')
    let isLive: boolean | undefined
    if (isLiveParam === 'true') isLive = true
    else if (isLiveParam === 'false') isLive = false

    const flvConfig = {
      enable: flvLowLatency.enable,
      maxTargetBufferToPlay: flvLowLatency.maxTargetBufferToPlay,
      minTargetBufferToPlay: flvLowLatency.minTargetBufferToPlay,
      expectedAdjustmentTime: flvLowLatency.expectedAdjustmentTime,
      maxPlaybackRate: flvLowLatency.maxPlaybackRate,
      minIntervalTimeFromNormalToAccelerated:
        flvLowLatency.minIntervalTimeFromNormalToAccelerated,
      minPeriodTimeOfMaxCountOfAcceleration:
        flvLowLatency.minPeriodTimeOfMaxCountOfAcceleration,
      maxCountOfAccelerationInPeriodTime:
        flvLowLatency.maxCountOfAccelerationInPeriodTime,
    }

    const hlsLowLatConfig = {
      enable: hlsLowLatency.enable,
      tsCheckWindowInit: Number.parseFloat(hlsLowLatency.tsCheckWindowInit),
      tsCheckWindowMax: Number.parseFloat(hlsLowLatency.tsCheckWindowMax),
      tsCheckWindowStep: Number.parseFloat(hlsLowLatency.tsCheckWindowStep),
      maxPlaybackRate: Number.parseFloat(hlsLowLatency.maxPlaybackRate),
      minPlaybackRate: Number.parseFloat(hlsLowLatency.minPlaybackRate),
      slowDownloadToNowThreshold: Number.parseFloat(
        hlsLowLatency.slowDownloadToNowThreshold,
      ),
      playbackRatePolicyConfigs: buildHlsLowLatencyPlaybackRatePolicyConfigs(),
    }

    const playerConfig: Record<string, unknown> = {
      sources,
      autoplay,
      streamId: '123456789',
      userId: 111111111,
      topicId: 1111111111,
      stalledRecordInfoStatisticsEnabled: true,
      secureLinkConfig: {
        enable: true,
        key: 'Ex$99UTlwB{#5N=',
        sVip: false,
        timeSyncUrl: '//worldtimeapi.org/api/timezone/Asia/Shanghai',
      },
      lowLatancyFlvConfig: flvConfig,
      lowLatencyHlsConfig: hlsLowLatConfig,
      stalledSourceSwitchPolicy: {
        enable: false,
        slidingWindowInMs: 30 * 1000,
        maxStalledDurationInMsInSlidingWindowInMs: 4 * 1000,
        maxStalledCountInSlidingWindowInMs: 2,
        minStalledDurationThreshold: 200,
      },
      hlsLoadPolicy,
      isLive,
      restartTimeoutForRecoverFromPaused: restartTimeout,
      enableH265VideoDisplayDetection: true,
      muteOnVideoDisplayDetect: true,
      logServerConfig: {
        domain: 'byplay-log.cdlab.workers.dev',
        port: 443,
        path: 'monitor',
        secure: true,
      },
      logConfig: {
        level: 0,
        categories: 'BasePlayer@agora-rte',
        uploadIntervalSeconds: 15,
        uploadUrl:
          'https://byplay-log.cdlab.workers.dev/monitor?bury_content=stream_loguploaddev_stat',
      },
    }

    const vplayer = window.vplayer
    vplayer.enableDebug(true)

    const player = vplayer.createVzanPlayer('videoElement', playerConfig)
    vplayer.setEnableBackgroundPlaying(true)

    player.on(vplayer.Events.PLAYER_CREATING, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_CREATED, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_DESTROYED, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_WARN, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_ERROR, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_STATISTICS, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })
    player.on(vplayer.Events.PLAYER_SOURCE_SWITCHED, (event, data) => {
      console.log('demo event:', event, 'data:', data)
    })

    player.setOnStalledThresholdTriggered((stalledState: unknown) => {
      console.warn('StalledThresholdTriggered, stalledState:', stalledState)
      player.switchNextSource(JSON.stringify(stalledState), false)
    })

    player.start()
    console.log('player version:', player.version())

    vplayer.setTsSegmentCountThreshold(8)
    playerRef.current = player
  }, [urls, restartTimeout, hlsLoadPolicy, flvLowLatency, hlsLowLatency])

  const stopPlayer = useCallback(() => {
    playerRef.current?.stop()
  }, [])

  const playPlayer = useCallback(() => {
    playerRef.current?.play()
  }, [])

  const togglePlayer = useCallback(() => {
    playerRef.current?.toggle()
  }, [])

  const seekPlayer = useCallback(() => {
    const time = Number(seekTime)
    if (playerRef.current && !Number.isNaN(time)) {
      playerRef.current.seek(time)
    }
  }, [seekTime])

  const restartPlayer = useCallback(() => {
    playerRef.current?.restart('restart manually', undefined)
  }, [])

  const destroyPlayer = useCallback(() => {
    if (playerRef.current) {
      console.log('destroy player')
      playerRef.current.destroy()
      playerRef.current = null
    }

    const video = videoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    setIsPlaying(false)
  }, [])

  const setPlayerSpeed = useCallback(() => {
    const rate = Number(speed)
    if (playerRef.current && rate > 0) {
      playerRef.current.setSpeed(rate)
    }
  }, [speed])

  const switchNextSource = useCallback(() => {
    playerRef.current?.switchNextSource('', true)
  }, [])

  const onUrlsChange = useCallback((newUrls: string) => {
    setUrls(newUrls)
    const sources = parseUrls(newUrls)
    if (playerRef.current && sources.length > 0) {
      playerRef.current.switchSources(sources)
    }
  }, [])

  // Listen to video play/pause events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [])

  return {
    // Refs
    videoRef,

    // State
    urls,
    isPlaying,
    isScriptReady,
    restartTimeout,
    speed,
    seekTime,
    hlsLoadPolicy,
    flvLowLatency,
    hlsLowLatency,

    // Setters
    setUrls: onUrlsChange,
    setRestartTimeout,
    setSpeed,
    setSeekTime,
    setHlsLoadPolicy,
    setFlvLowLatency,
    setHlsLowLatency,

    // Actions
    onScriptReady,
    load: loadPlayer,
    stop: stopPlayer,
    play: playPlayer,
    toggle: togglePlayer,
    seek: seekPlayer,
    restart: restartPlayer,
    destroy: destroyPlayer,
    setPlayerSpeed,
    switchNext: switchNextSource,
  }
}

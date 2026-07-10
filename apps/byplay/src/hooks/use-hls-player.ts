'use client'

import type { HlsConfig as HlsJsConfig } from 'hls.js'
import Hls from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdFilterMode, FilterStats } from '@/lib/m3u8-utils'
import { filterM3u8Ad } from '@/lib/m3u8-utils'

export type { AdFilterMode } from '@/lib/m3u8-utils'

export type HlsConfig = Pick<
  HlsJsConfig,
  | 'enableWorker'
  | 'lowLatencyMode'
  | 'maxBufferLength'
  | 'maxMaxBufferLength'
  | 'maxBufferSize'
  | 'maxBufferHole'
  | 'backBufferLength'
  | 'startFragPrefetch'
  | 'abrEwmaDefaultEstimate'
  | 'abrBandWidthFactor'
  | 'abrBandWidthUpFactor'
  | 'fragLoadingMaxRetry'
  | 'manifestLoadingMaxRetry'
  | 'levelLoadingMaxRetry'
  | 'fragLoadingRetryDelay'
  | 'fragLoadingTimeOut'
  | 'manifestLoadingTimeOut'
  | 'levelLoadingTimeOut'
> & {
  autoPlay: boolean
  adFilterMode: AdFilterMode
  adKeywords: string[]
}

export const DEFAULT_HLS_CONFIG: HlsConfig = {
  autoPlay: true,
  enableWorker: true,
  lowLatencyMode: false,
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  maxBufferSize: 60 * 1000 * 1000,
  maxBufferHole: 0.5,
  backBufferLength: 30,
  startFragPrefetch: true,
  abrEwmaDefaultEstimate: 500000,
  abrBandWidthFactor: 0.8,
  abrBandWidthUpFactor: 0.7,
  fragLoadingMaxRetry: 6,
  manifestLoadingMaxRetry: 4,
  levelLoadingMaxRetry: 4,
  fragLoadingRetryDelay: 1000,
  fragLoadingTimeOut: 20000,
  manifestLoadingTimeOut: 10000,
  levelLoadingTimeOut: 10000,
  adFilterMode: 'off',
  adKeywords: [],
}

export interface HlsLogEntry {
  time: string
  type: 'info' | 'warn' | 'error'
  event: string
  detail: string
}

export interface HlsPlayerState {
  isSupported: boolean
  isLoading: boolean
  isPlaying: boolean
  isDirectVideo: boolean
  error: string | null
  levels: { height: number; width: number; bitrate: number; codec: string }[]
  currentLevel: number
  currentTime: number
  duration: number
  buffered: number
  droppedFrames: number
  bandwidth: number
}

export function useHlsPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [logs, setLogs] = useState<HlsLogEntry[]>([])

  const [state, setState] = useState<HlsPlayerState>({
    isSupported: false,
    isLoading: false,
    isPlaying: false,
    isDirectVideo: false,
    error: null,
    levels: [],
    currentLevel: -1,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    droppedFrames: 0,
    bandwidth: 0,
  })

  const update = useCallback(
    (partial: Partial<HlsPlayerState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    [],
  )

  const addLog = useCallback(
    (type: HlsLogEntry['type'], event: string, detail: string) => {
      const entry: HlsLogEntry = {
        time: new Date().toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
        }),
        type,
        event,
        detail,
      }
      setLogs((prev) => [entry, ...prev].slice(0, 200))
    },
    [],
  )

  const clearLogs = useCallback(() => setLogs([]), [])

  // Check support on mount
  useEffect(() => {
    const video = videoRef.current
    const nativeSupport = video
      ? !!video.canPlayType('application/vnd.apple.mpegurl')
      : false
    update({ isSupported: Hls.isSupported() || nativeSupport })
  }, [update])

  // Sync playback time, buffer, dropped frames
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      const quality = video.getVideoPlaybackQuality?.()
      update({
        currentTime: video.currentTime,
        duration: video.duration || 0,
        droppedFrames: quality?.droppedVideoFrames ?? 0,
      })
    }

    const onProgress = () => {
      if (video.buffered.length > 0) {
        update({ buffered: video.buffered.end(video.buffered.length - 1) })
      }
    }

    const onPlay = () => update({ isPlaying: true })
    const onPause = () => update({ isPlaying: false })

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('progress', onProgress)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('progress', onProgress)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [update])

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    // Also clear native video src to avoid stale playback
    const video = videoRef.current
    if (video) {
      video.removeAttribute('src')
      video.load()
    }
  }, [])

  const loadSource = useCallback(
    (src: string, config: HlsConfig) => {
      const video = videoRef.current
      if (!video || !src) return

      destroyHls()

      // Check if this is a direct video file (mp4, webm, ogg, etc.)
      const directVideo = /\.(mp4|webm|ogg|ogv|mov|avi|mkv)(\?.*)?$/i.test(src)

      update({
        error: null,
        isLoading: true,
        isDirectVideo: directVideo,
        levels: [],
        currentLevel: -1,
        bandwidth: 0,
        droppedFrames: 0,
      })
      addLog('info', 'LOAD', `Loading: ${src}`)

      const isNativeHls = !!video.canPlayType('application/vnd.apple.mpegurl')
      const { autoPlay, adFilterMode, adKeywords, ...hlsConfig } = config
      const isAdFilterEnabled = adFilterMode !== 'off'

      if (isAdFilterEnabled) {
        addLog(
          'info',
          'AD_FILTER',
          `Mode: ${adFilterMode}, Keywords: ${adKeywords.length > 0 ? adKeywords.join(', ') : '(none)'}`,
        )
      }

      if (directVideo) {
        video.src = src
        addLog('info', 'DIRECT_VIDEO', 'Using native HTML5 video playback')
        video.addEventListener(
          'loadedmetadata',
          () => {
            update({ isLoading: false, duration: video.duration || 0 })
            addLog(
              'info',
              'LOADED',
              `Video loaded: ${video.videoWidth}x${video.videoHeight}`,
            )
            if (autoPlay) {
              video.play().catch(() => {
                video.muted = true
                video.play().catch(console.warn)
              })
            }
          },
          { once: true },
        )
        video.addEventListener(
          'error',
          () => {
            const mediaError = video.error
            const errorMsg = mediaError
              ? `Video error (code ${mediaError.code}): ${mediaError.message || 'Unknown'}`
              : 'Video playback error'
            update({ error: errorMsg, isLoading: false })
            addLog('error', 'VIDEO_ERROR', errorMsg)
          },
          { once: true },
        )
      } else if (Hls.isSupported()) {
        const hlsInitConfig: Partial<HlsJsConfig> = {
          ...hlsConfig,
          abrEwmaFastLive: 3,
          abrEwmaSlowLive: 9,
          abrEwmaFastVoD: 3,
          abrEwmaSlowVoD: 9,
          fragLoadingMaxRetryTimeout: 64000,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 64000,
          levelLoadingRetryDelay: 1000,
          levelLoadingMaxRetryTimeout: 64000,
        }

        if (isAdFilterEnabled) {
          // biome-ignore lint/suspicious/noExplicitAny: hls.js DefaultConfig.loader is not strictly typed in public API
          const DefaultLoader = (Hls as any).DefaultConfig.loader
          const onFilter = (
            url: string,
            type: string,
            stats: FilterStats,
            elapsedMs: number,
          ) => {
            addLog(
              'info',
              'AD_FILTER_RUN',
              `${type} ${url.split('/').pop() || url} — blocks ${stats.blocksFiltered}/${stats.blocksScanned}, segs ${stats.segmentsFiltered}, cue ${stats.cueAdSections}, kw ${stats.keywordHits} (${elapsedMs}ms)`,
            )
          }

          class AdFilterLoader extends DefaultLoader {
            // biome-ignore lint/suspicious/noExplicitAny: matches hls.js loader signature
            load(context: any, loaderConfig: any, callbacks: any) {
              if (context.type === 'manifest' || context.type === 'level') {
                const originalOnSuccess = callbacks.onSuccess
                callbacks.onSuccess = (
                  // biome-ignore lint/suspicious/noExplicitAny: hls.js loader callback shape
                  response: any,
                  // biome-ignore lint/suspicious/noExplicitAny: hls.js loader callback shape
                  loaderStats: any,
                  // biome-ignore lint/suspicious/noExplicitAny: hls.js loader callback shape
                  ctx: any,
                  // biome-ignore lint/suspicious/noExplicitAny: hls.js loader callback shape
                  networkDetails: any,
                ) => {
                  if (typeof response.data === 'string') {
                    const filterStats: FilterStats = {
                      blocksScanned: 0,
                      blocksFiltered: 0,
                      segmentsFiltered: 0,
                      cueAdSections: 0,
                      keywordHits: 0,
                    }
                    const start = performance.now()
                    try {
                      response.data = filterM3u8Ad(
                        response.data,
                        ctx.url,
                        adFilterMode,
                        adKeywords,
                        filterStats,
                      )
                      onFilter(
                        ctx.url,
                        ctx.type,
                        filterStats,
                        Math.round(performance.now() - start),
                      )
                    } catch (e) {
                      addLog(
                        'warn',
                        'AD_FILTER_ERROR',
                        e instanceof Error ? e.message : String(e),
                      )
                    }
                  }
                  originalOnSuccess(response, loaderStats, ctx, networkDetails)
                }
              }
              super.load(context, loaderConfig, callbacks)
            }
          }
          // biome-ignore lint/suspicious/noExplicitAny: loader slot expects an hls.js-internal type
          ;(hlsInitConfig as any).loader = AdFilterLoader
        }

        const hls = new Hls(hlsInitConfig as HlsJsConfig)

        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(video)

        addLog(
          'info',
          'HLS_INIT',
          `Worker: ${hlsConfig.enableWorker}, LowLatency: ${hlsConfig.lowLatencyMode}, Buffer: ${hlsConfig.maxBufferLength}s`,
        )

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const levels = hls.levels.map((level) => ({
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            codec: level.videoCodec || '',
          }))

          const hasHEVC = hls.levels.some(
            (level) =>
              level.videoCodec?.toLowerCase().includes('hev') ||
              level.videoCodec?.toLowerCase().includes('h265'),
          )

          update({
            isLoading: false,
            levels,
            ...(hasHEVC
              ? {
                  error: 'HEVC/H.265 detected, browser may not support it',
                }
              : {}),
          })

          addLog(
            'info',
            'MANIFEST_PARSED',
            `${data.levels.length} level(s), codecs: ${levels.map((l) => l.codec || 'unknown').join(', ')}`,
          )

          if (autoPlay) {
            video.play().catch(() => {
              video.muted = true
              video.play().catch(console.warn)
            })
          }
        })

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          update({ currentLevel: data.level })
          const level = hls.levels[data.level]
          if (level) {
            addLog(
              'info',
              'LEVEL_SWITCHED',
              `Level ${data.level}: ${level.height}p @ ${Math.round(level.bitrate / 1000)} Kbps`,
            )
          }
        })

        hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
          const stats = data.frag.stats
          if (stats.loaded && stats.loading.end && stats.loading.start) {
            const duration = stats.loading.end - stats.loading.start
            const bw =
              duration > 0
                ? Math.round((stats.loaded * 8) / (duration / 1000))
                : 0
            update({ bandwidth: bw })
          }
          addLog(
            'info',
            'FRAG_LOADED',
            `SN: ${data.frag.sn}, Level: ${data.frag.level}, Size: ${Math.round((data.frag.stats.loaded || 0) / 1024)} KB`,
          )
        })

        hls.on(Hls.Events.LEVEL_LOADING, (_event, data) => {
          addLog('info', 'LEVEL_LOADING', `Level ${data.level}`)
        })

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          addLog('info', 'BUFFER_APPENDED', 'Buffer updated')
        })

        // Error handling with retry
        let networkRetries = 0
        let mediaRetries = 0
        const MAX_RETRIES = 3

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            addLog('warn', 'ERROR (non-fatal)', `${data.type}: ${data.details}`)
            return
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetries++
              addLog(
                'error',
                'NETWORK_ERROR',
                `${data.details} (retry ${networkRetries}/${MAX_RETRIES})`,
              )
              if (networkRetries <= MAX_RETRIES) {
                hls.startLoad()
              } else {
                update({
                  error: `Network error: ${data.details || 'Failed to load stream'}`,
                  isLoading: false,
                })
                hls.destroy()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaRetries++
              addLog(
                'error',
                'MEDIA_ERROR',
                `${data.details} (retry ${mediaRetries}/${MAX_RETRIES})`,
              )
              if (mediaRetries <= MAX_RETRIES) {
                hls.recoverMediaError()
              } else {
                update({
                  error: `Media error: ${data.details || 'Unsupported format'}`,
                  isLoading: false,
                })
                hls.destroy()
              }
              break
            default:
              addLog('error', 'FATAL_ERROR', data.details || 'Unknown error')
              update({
                error: `Fatal error: ${data.details || 'Unknown error'}`,
                isLoading: false,
              })
              hls.destroy()
              break
          }
        })
      } else if (isNativeHls) {
        video.src = src
        addLog('info', 'NATIVE_HLS', 'Using native HLS playback')
        video.addEventListener(
          'loadedmetadata',
          () => {
            update({ isLoading: false })
            addLog('info', 'LOADED', 'Native HLS metadata loaded')
            if (autoPlay) video.play().catch(console.warn)
          },
          { once: true },
        )
        video.addEventListener(
          'error',
          () => {
            update({ error: 'Native HLS playback error', isLoading: false })
            addLog('error', 'NATIVE_ERROR', 'Native HLS playback error')
          },
          { once: true },
        )
      } else {
        update({
          error: 'HLS is not supported in this browser',
          isLoading: false,
        })
        addLog('error', 'NOT_SUPPORTED', 'HLS is not supported')
      }
    },
    [destroyHls, update, addLog],
  )

  const setLevel = useCallback(
    (level: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = level
        addLog(
          'info',
          'SET_LEVEL',
          `Manual level: ${level === -1 ? 'Auto' : level}`,
        )
      }
    },
    [addLog],
  )

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = rate
        addLog('info', 'PLAYBACK_RATE', `Set to ${rate}x`)
      }
    },
    [addLog],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => destroyHls()
  }, [destroyHls])

  return {
    videoRef,
    state,
    logs,
    loadSource,
    setLevel,
    setPlaybackRate,
    destroyHls,
    clearLogs,
  }
}

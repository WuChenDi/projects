import Hls from 'hls.js'
import { useEffect, useRef } from 'react'
import { filterM3u8Ad } from '@/lib/utils/m3u8-utils'
import { usePlayerSettings } from './usePlayerSettings'

interface UseHlsPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  src: string
  autoPlay?: boolean
  onAutoPlayPrevented?: (error: Error) => void
  onError?: (message: string) => void
}

export function useHlsPlayer({
  videoRef,
  src,
  autoPlay = false,
  onAutoPlayPrevented,
  onError,
}: UseHlsPlayerProps) {
  const hlsRef = useRef<Hls | null>(null)
  const { adFilterMode, adKeywords } = usePlayerSettings()
  const isAdFilterEnabled = adFilterMode !== 'off'

  // Use refs for values that should NOT trigger player reinitialization.
  // adKeywords is an array (new reference every render when store updates),
  // and callbacks may be non-memoized, so both would cause spurious restarts.
  const adKeywordsRef = useRef(adKeywords)
  adKeywordsRef.current = adKeywords
  const adFilterModeRef = useRef(adFilterMode)
  adFilterModeRef.current = adFilterMode
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onAutoPlayPreventedRef = useRef(onAutoPlayPrevented)
  onAutoPlayPreventedRef.current = onAutoPlayPrevented

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    let hls: Hls | null = null
    let extraBlobs: string[] = []

    // Check if HLS is supported natively (Safari, Mobile Chrome)
    const isNativeHlsSupported = video.canPlayType(
      'application/vnd.apple.mpegurl',
    )

    if (Hls.isSupported()) {
      // Define custom loader class to intercept manifest loading
      // We use 'any' cast because default loader type might not be strictly exposed in all typings
      const DefaultLoader = (Hls as any).DefaultConfig.loader

      class AdFilterLoader extends DefaultLoader {
        load(context: any, config: any, callbacks: any) {
          if (
            isAdFilterEnabled &&
            (context.type === 'manifest' || context.type === 'level')
          ) {
            const originalOnSuccess = callbacks.onSuccess
            callbacks.onSuccess = (
              response: any,
              stats: any,
              context: any,
              networkDetails: any,
            ) => {
              if (typeof response.data === 'string') {
                try {
                  // Filter the content
                  response.data = filterM3u8Ad(
                    response.data,
                    context.url,
                    adFilterModeRef.current,
                    adKeywordsRef.current,
                  )
                } catch (e) {
                  console.warn('[HLS] Ad filter error:', e)
                }
              }
              originalOnSuccess(response, stats, context, networkDetails)
            }
          }
          super.load(context, config, callbacks)
        }
      }

      if (!isNativeHlsSupported || isAdFilterEnabled) {
        // If ad filtering is on, we force Hls.js even on native-supported desktop browsers
        // Exceptions might exist for iOS where MSE is strictly not available, check Hls.isSupported() result carefully.
        // Hls.isSupported() is false on iOS Safari usually, so this block won't run there.

        const config: any = {
          // Worker & Performance
          enableWorker: true,
          lowLatencyMode: false,

          // Buffer Settings
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,

          // Start with more buffer
          startFragPrefetch: true,

          // ABR Settings
          abrEwmaDefaultEstimate: 500000,
          abrEwmaFastLive: 3,
          abrEwmaSlowLive: 9,
          abrEwmaFastVoD: 3,
          abrEwmaSlowVoD: 9,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.7,

          // Loading Settings
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetryTimeout: 64000,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 64000,
          levelLoadingMaxRetry: 4,
          levelLoadingRetryDelay: 1000,
          levelLoadingMaxRetryTimeout: 64000,

          // Timeouts
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,

          // Backbuffer
          backBufferLength: 30,
        }

        // Use custom loader if ad filtering is enabled
        if (isAdFilterEnabled) {
          config.loader = AdFilterLoader
        }

        hls = new Hls(config)
        hlsRef.current = hls

        hls.loadSource(src)
        hls.attachMedia(video)

        // Try to play; if blocked by autoplay policy, retry muted, then surface error.
        const tryPlay = () => {
          video.play().catch(() => {
            video.muted = true
            video.play().catch((err) => {
              onAutoPlayPreventedRef.current?.(err)
            })
          })
        }

        // Auto Play Handler
        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
          if (autoPlay && video.paused && data.frag.start === 0) {
            tryPlay()
          }
        })

        // Manifest Parsed Handler
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Check for HEVC
          if (hls) {
            const levels = hls.levels
            if (levels && levels.length > 0) {
              const hasHEVC = levels.some(
                (level) =>
                  level.videoCodec?.toLowerCase().includes('hev') ||
                  level.videoCodec?.toLowerCase().includes('h265'),
              )
              if (hasHEVC) {
                console.warn('[HLS] ⚠️ HEVC detected')
                onErrorRef.current?.(
                  '检测到 HEVC/H.265 编码，当前浏览器可能不支持',
                )
              }
            }
          }

          if (autoPlay) {
            tryPlay()
          }
        })

        // Error Handling
        let networkErrorRetries = 0
        let mediaErrorRetries = 0
        const MAX_RETRIES = 3

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                networkErrorRetries++
                if (networkErrorRetries <= MAX_RETRIES) {
                  hls?.startLoad()
                } else {
                  onErrorRef.current?.('网络错误：无法加载视频流')
                  hls?.destroy()
                }
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                mediaErrorRetries++
                if (mediaErrorRetries <= MAX_RETRIES) {
                  hls?.recoverMediaError()
                } else {
                  onErrorRef.current?.('媒体错误：视频格式不支持或已损坏')
                  hls?.destroy()
                }
                break
              default:
                console.error('[HLS] Fatal error, cannot recover:', data)
                onErrorRef.current?.(`致命错误：${data.details || '未知错误'}`)
                hls?.destroy()
                break
            }
          }
        })
      } else {
        // Native HLS (Desktop Safari, no Filter)
        video.src = src
      }
    } else if (isNativeHlsSupported) {
      // Native HLS (iOS, Mobile Safari)
      // Limitations: Native HLS cannot easily intercept sub-playlist requests.
      // We use fetch+blob for the master playlist as a best 'first-level' filter.
      // If the ad discontinuity is in the master playlist (rare for ads, common for periods), it works.
      // If it's in sub-playlists, it might fail unless we parse and blob those too (complex).

      if (isAdFilterEnabled) {
        const processMasterPlaylist = async (masterSrc: string) => {
          // Move blob tracking outside try to ensure cleanup on error
          const createdBlobs: string[] = []

          // Safely resolve relative URLs to absolute (handles iOS Safari scenarios)
          let absoluteMasterSrc: string
          try {
            absoluteMasterSrc = new URL(
              masterSrc,
              window.location.href,
            ).toString()
          } catch {
            absoluteMasterSrc = masterSrc // Fallback if URL parsing fails
          }

          try {
            const response = await fetch(absoluteMasterSrc)
            const masterContent = await response.text()

            // If it's a simple playlist (no variants), just filter and play
            if (!masterContent.includes('#EXT-X-STREAM-INF')) {
              const filtered = filterM3u8Ad(
                masterContent,
                absoluteMasterSrc,
                adFilterMode,
                adKeywords,
              )
              const blob = new Blob([filtered], {
                type: 'application/vnd.apple.mpegurl',
              })
              const blobUrl = URL.createObjectURL(blob)
              createdBlobs.push(blobUrl)
              return { masterBlobUrl: blobUrl, allBlobs: createdBlobs }
            }

            // It IS a master playlist. Use map + Promise.all for clean concurrent processing.
            const lines = masterContent.split(/\r?\n/)

            // Process each line, looking back at previous line to determine context
            const lineProcessingPromises = lines.map(async (line, index) => {
              const trimmedLine = line.trim()

              // Handle #EXT-X-MEDIA:URI="..."
              if (
                trimmedLine.startsWith('#EXT-X-MEDIA') &&
                trimmedLine.includes('URI="')
              ) {
                const uriMatch = trimmedLine.match(/URI="([^"]+)"/)
                const uri = uriMatch?.[1]
                if (uri) {
                  // Process if relative or absolute URL; fetch will handle CORS
                  const isRelative = !uri.startsWith('http')

                  if (isRelative || uri.startsWith('http')) {
                    try {
                      const absoluteUrl = isRelative
                        ? new URL(uri, absoluteMasterSrc).toString()
                        : uri
                      const subRes = await fetch(absoluteUrl)
                      const subContent = await subRes.text()
                      const filteredSub = filterM3u8Ad(
                        subContent,
                        absoluteUrl,
                        adFilterMode,
                        adKeywords,
                      )
                      const subBlob = new Blob([filteredSub], {
                        type: 'application/vnd.apple.mpegurl',
                      })
                      const subBlobUrl = URL.createObjectURL(subBlob)
                      createdBlobs.push(subBlobUrl)
                      return line.replace(`URI="${uri}"`, `URI="${subBlobUrl}"`)
                    } catch (e) {
                      console.warn(
                        '[HLS Native] Failed to process EXT-X-MEDIA URI:',
                        e,
                      )
                      return line
                    }
                  }
                }
              }

              // Handle playlist URL (line after #EXT-X-STREAM-INF)
              const prevLine = index > 0 ? lines[index - 1].trim() : ''
              if (
                prevLine.startsWith('#EXT-X-STREAM-INF') &&
                trimmedLine &&
                !trimmedLine.startsWith('#')
              ) {
                // Process if relative or absolute URL; fetch will handle CORS
                const isRelative = !trimmedLine.startsWith('http')

                if (isRelative || trimmedLine.startsWith('http')) {
                  try {
                    const absoluteUrl = isRelative
                      ? new URL(trimmedLine, absoluteMasterSrc).toString()
                      : trimmedLine
                    const subRes = await fetch(absoluteUrl)
                    const subContent = await subRes.text()
                    const filteredSub = filterM3u8Ad(
                      subContent,
                      absoluteUrl,
                      adFilterMode,
                      adKeywords,
                    )
                    const subBlob = new Blob([filteredSub], {
                      type: 'application/vnd.apple.mpegurl',
                    })
                    const subBlobUrl = URL.createObjectURL(subBlob)
                    createdBlobs.push(subBlobUrl)
                    return subBlobUrl
                  } catch (e) {
                    console.warn(
                      '[HLS Native] Failed to process variant playlist:',
                      e,
                    )
                    return line
                  }
                }
              }

              // All other lines pass through unchanged
              return line
            })

            const processedLines = await Promise.all(lineProcessingPromises)

            // Join back
            const finalMasterContent = processedLines.join('\n')
            const masterBlob = new Blob([finalMasterContent], {
              type: 'application/vnd.apple.mpegurl',
            })
            const masterBlobUrl = URL.createObjectURL(masterBlob)
            createdBlobs.push(masterBlobUrl)

            return { masterBlobUrl, allBlobs: createdBlobs }
          } catch (e) {
            // Critical: Clean up any blobs created before the error
            for (const blobUrl of createdBlobs) {
              try {
                URL.revokeObjectURL(blobUrl)
              } catch {
                /* ignore cleanup errors */
              }
            }
            console.error('[HLS Native] Recursive fetch failed', e)
            throw e
          }
        }

        processMasterPlaylist(src)
          .then((result) => {
            video.src = result.masterBlobUrl
            extraBlobs = result.allBlobs
          })
          .catch((e) => {
            console.warn(
              '[HLS Native] Ad filtering failed, falling back to original source.',
              e,
            )
            onErrorRef.current?.('广告过滤失败，已回退到原始视频流')
            video.src = src
          })
      } else {
        video.src = src
      }
    } else {
      console.error('[HLS] HLS not supported')
      onErrorRef.current?.('当前浏览器不支持 HLS 视频播放')
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
      extraBlobs.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [src, videoRef, autoPlay, isAdFilterEnabled])
}

'use client'

import { logger } from '@cdlab996/utils'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  DownloadState,
  FinishItem,
  RangeDownload,
  VariantStream,
} from '@/lib'
import {
  AESDecryptor,
  applyURL,
  estimateFileSize,
  FETCH_TIMEOUT_MS,
  fetchData,
  getFileExtension,
  isDirectVideoUrl,
  isMasterPlaylist,
  MAX_SEGMENT_RETRIES,
  parseMasterPlaylistContent,
  RETRY_BASE_DELAY_MS,
  triggerBrowserDownload,
  VIDEO_MIME_MAP,
} from '@/lib'
import type { DownloadSettings } from '@/stores/settings-store'

export type {
  DownloadState,
  FinishItem,
  RangeDownload,
  VariantStream,
} from '@/lib'

interface AesConf {
  method: string
  uri: string
  iv: string | Uint8Array
  key: ArrayBuffer | null
  decryptor: AESDecryptor | null
  stringToBuffer: (str: string) => Uint8Array
}

// ============================================================
// Hook
// ============================================================

export function useVideoDownloader(settings: DownloadSettings) {
  const t = useTranslations()

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [url, setUrl] = useState(
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  )
  const [title, setTitle] = useState('')
  const [customFileName, setCustomFileName] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isLoadingVariant, setIsLoadingVariant] = useState(false)

  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    isPaused: false,
    isGetMP4: false,
    downloadIndex: 0,
    streamDownloadIndex: 0,
  })

  const [finishList, setFinishList] = useState<FinishItem[]>([])
  const [tsUrlList, setTsUrlList] = useState<string[]>([])
  const [variants, setVariants] = useState<VariantStream[]>([])
  const [isDirectVideo, setIsDirectVideo] = useState(false)

  const [isStreamSupported, setIsStreamSupported] = useState(false)
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)
  const isStreamModeRef = useRef(false)

  const streamWriter = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null,
  )

  const [rangeDownload, setRangeDownload] = useState<RangeDownload>({
    startSegment: '',
    endSegment: '',
  })

  const [aesConf, setAesConf] = useState<AesConf>({
    method: '',
    uri: '',
    iv: '',
    key: null,
    decryptor: null,
    stringToBuffer: (str: string) => new TextEncoder().encode(str),
  })

  // ---- Refs ----
  const beginTimeRef = useRef(new Date())
  const durationSecondRef = useRef(0)
  const mediaFileListRef = useRef<ArrayBuffer[]>([])
  const downloadingTimestamps = useRef<Map<number, number>>(new Map())
  const m3u8ContentRef = useRef('')
  const downloadAbortRef = useRef<AbortController | null>(null)
  const isRetryingRef = useRef(false)
  const downloadCompleteResolverRef = useRef<(() => void) | null>(null)

  // Mirror state in refs so batch can call startDownload immediately after parse
  const tsUrlListRef = useRef<string[]>([])
  const finishListRef = useRef<FinishItem[]>([])
  const rangeDownloadRef = useRef<RangeDownload>(rangeDownload)
  const isDirectVideoRef = useRef(false)

  const downloadStateRef = useRef(downloadState)
  downloadStateRef.current = downloadState

  const aesConfRef = useRef(aesConf)
  aesConfRef.current = aesConf

  const { finishNum, errorNum } = useMemo(() => {
    const finished = finishList.filter(
      (item) => item.status === 'finish',
    ).length
    const errors = finishList.filter((item) => item.status === 'error').length
    return { finishNum: finished, errorNum: errors }
  }, [finishList])

  const targetSegment = useMemo(() => {
    const start = Math.max(parseInt(rangeDownload.startSegment) || 1, 1)
    const end = Math.max(
      parseInt(rangeDownload.endSegment) || tsUrlList.length,
      1,
    )
    const validStart = Math.min(start, tsUrlList.length)
    const validEnd = Math.min(end, tsUrlList.length)
    const finalStart = Math.min(validStart, validEnd)
    const finalEnd = Math.max(validStart, validEnd)
    return finalEnd - finalStart + 1
  }, [rangeDownload.startSegment, rangeDownload.endSegment, tsUrlList.length])

  const isParsed = tsUrlList.length > 0

  // ---- AES decrypt ----
  const aesDecrypt = (data: ArrayBuffer, index: number): ArrayBuffer => {
    const conf = aesConfRef.current
    const iv =
      conf.iv ||
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index])
    const ivBuffer = iv instanceof Uint8Array ? iv.buffer : iv
    return conf.decryptor!.decrypt(data, 0, ivBuffer as ArrayBuffer, true)
  }

  // ---- MP4 conversion ----
  const conversionMp4 = async (
    data: ArrayBuffer,
    index: number,
    startSegment: number,
    isGetMP4: boolean,
  ): Promise<ArrayBuffer> => {
    if (!isGetMP4) return data

    try {
      // @ts-expect-error dynamic import
      const muxjs = await import('mux.js')
      return await new Promise<ArrayBuffer>((resolve) => {
        const transmuxer = new muxjs.default.mp4.Transmuxer({
          keepOriginalTimestamps: true,
          duration: parseInt(String(durationSecondRef.current)),
        })

        transmuxer.on('data', (segment: any) => {
          if (index === startSegment - 1) {
            const combined = new Uint8Array(
              segment.initSegment.byteLength + segment.data.byteLength,
            )
            combined.set(segment.initSegment, 0)
            combined.set(segment.data, segment.initSegment.byteLength)
            resolve(combined.buffer)
          } else {
            resolve(segment.data.buffer)
          }
        })

        transmuxer.push(new Uint8Array(data))
        transmuxer.flush()
      })
    } catch (error) {
      logger.error('MP4 conversion failed:', error)
      toast.error(t('download.mp4Failed'))
      return data
    }
  }

  // ---- Process single TS segment ----
  const dealTS = async (
    file: ArrayBuffer,
    index: number,
    startSegment: number,
    isGetMP4: boolean,
  ) => {
    const data = aesConfRef.current.uri ? aesDecrypt(file, index) : file
    const afterData = await conversionMp4(data, index, startSegment, isGetMP4)

    const mediaListIndex = index - startSegment + 1
    mediaFileListRef.current[mediaListIndex] = afterData

    setFinishList((prev) => {
      const newList = [...prev]
      newList[index] = { ...newList[index], status: 'finish' }
      const newFinishNum = newList.filter(
        (item) => item.status === 'finish',
      ).length

      if (streamWriter.current) {
        let currentStreamIndex = downloadStateRef.current.streamDownloadIndex

        for (
          let idx = currentStreamIndex;
          idx < mediaFileListRef.current.length;
          idx++
        ) {
          if (mediaFileListRef.current[idx]) {
            streamWriter.current.write(
              new Uint8Array(mediaFileListRef.current[idx]),
            )
            mediaFileListRef.current[idx] = null as any
            currentStreamIndex = idx + 1
          } else {
            break
          }
        }

        downloadStateRef.current = {
          ...downloadStateRef.current,
          streamDownloadIndex: currentStreamIndex,
        }
        setDownloadState((p) => ({
          ...p,
          streamDownloadIndex: currentStreamIndex,
        }))

        if (
          currentStreamIndex >= targetSegment &&
          downloadStateRef.current.isDownloading
        ) {
          downloadStateRef.current = {
            ...downloadStateRef.current,
            isDownloading: false,
          }
          streamWriter.current.close()
          streamWriter.current = null
          setDownloadState((s) => ({ ...s, isDownloading: false }))
          toast.success(t('download.streamComplete', { count: newFinishNum }))
          downloadCompleteResolverRef.current?.()
          downloadCompleteResolverRef.current = null
        }
      } else if (
        !isStreamModeRef.current &&
        newFinishNum === targetSegment &&
        downloadStateRef.current.isDownloading
      ) {
        // Immediately mark as not downloading to prevent retryAll from
        // spawning a second downloadTS before React re-renders
        downloadStateRef.current = {
          ...downloadStateRef.current,
          isDownloading: false,
        }
        const completeMediaList = mediaFileListRef.current.filter(Boolean)
        triggerBrowserDownload(
          completeMediaList,
          customFileName.trim() ||
            title ||
            format(beginTimeRef.current, 'yyyyMMdd_HHmmss'),
          downloadStateRef.current.isGetMP4,
        )
        setDownloadState((s) => ({ ...s, isDownloading: false }))
        toast.success(t('download.downloadComplete', { count: newFinishNum }))
        downloadCompleteResolverRef.current?.()
        downloadCompleteResolverRef.current = null
      }

      return newList
    })
  }

  // ---- Concurrent TS download (async worker pool) ----
  const downloadTS = async (
    urlList: string[],
    finishItems: FinishItem[],
    startSegment: number,
    endSegment: number,
    isGetMP4: boolean,
  ) => {
    let currentIndex = downloadStateRef.current.downloadIndex

    const next = (): number | null => {
      if (currentIndex >= endSegment) return null
      const idx = currentIndex++
      setDownloadState((prev) => ({ ...prev, downloadIndex: currentIndex }))
      return idx
    }

    const worker = async () => {
      while (true) {
        const state = downloadStateRef.current
        if (state.isPaused || !state.isDownloading) return

        const index = next()
        if (index === null) return

        if (finishItems[index]?.status !== '') continue

        setFinishList((prev) => {
          const newList = [...prev]
          newList[index] = { ...newList[index], status: 'downloading' }
          return newList
        })
        downloadingTimestamps.current.set(index, Date.now())

        let success = false
        const { maxRetries, retryBaseDelayMs, timeoutMs } =
          settingsRef.current
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const currentState = downloadStateRef.current
          if (currentState.isPaused || !currentState.isDownloading) return

          try {
            const file = await fetchData(
              urlList[index],
              'file',
              downloadAbortRef.current?.signal,
              timeoutMs,
            )
            downloadingTimestamps.current.delete(index)
            if (!downloadStateRef.current.isDownloading) return
            await dealTS(file, index, startSegment, isGetMP4)
            success = true
            break
          } catch {
            if (!downloadStateRef.current.isDownloading) return
            if (attempt < maxRetries - 1) {
              const delay = retryBaseDelayMs * Math.pow(2, attempt)
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }

        if (!success) {
          downloadingTimestamps.current.delete(index)
          if (!downloadStateRef.current.isDownloading) return
          setFinishList((prev) => {
            const newList = [...prev]
            newList[index] = { ...newList[index], status: 'error' }

            const newErrorNum = newList.filter(
              (i) => i.status === 'error',
            ).length
            if (newErrorNum % 5 === 0 && newErrorNum > 0) {
              toast.warning(t('download.retryWarning', { count: newErrorNum }))
            }
            return newList
          })
        }
      }
    }

    const pendingCount = finishItems.filter((item) => item.status === '').length
    const concurrency = Math.min(
      settingsRef.current.concurrency,
      pendingCount || targetSegment,
    )
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  }

  // ---- Get AES key and initialize decryptor ----
  const getAES = async (
    currentAesConf: AesConf,
    urlList: string[],
    finishItems: FinishItem[],
    startSegment: number,
    endSegment: number,
    isGetMP4: boolean,
  ) => {
    try {
      const key = await fetchData(currentAesConf.uri, 'file')
      const decryptor = new AESDecryptor()
      decryptor.expandKey(key)

      const newAesConf: AesConf = {
        ...currentAesConf,
        key,
        decryptor,
      }
      setAesConf(newAesConf)
      aesConfRef.current = newAesConf

      await downloadTS(urlList, finishItems, startSegment, endSegment, isGetMP4)
    } catch {
      toast.error(t('parse.encryptedError'))
      setDownloadState((prev) => ({ ...prev, isDownloading: false }))
    }
  }

  // ---- Parse media playlist ----
  const parseMediaPlaylist = (m3u8Str: string, baseURL: string) => {
    const newTsUrlList: string[] = []
    const newFinishList: FinishItem[] = []

    m3u8Str.split('\n').forEach((item) => {
      if (/^[^#]/.test(item) && item.trim()) {
        newTsUrlList.push(applyURL(item, baseURL))
        newFinishList.push({ title: item, status: '' })
      }
    })

    if (newTsUrlList.length === 0) {
      toast.error(t('parse.emptyResource'))
      return
    }

    m3u8ContentRef.current = m3u8Str
    tsUrlListRef.current = newTsUrlList
    finishListRef.current = newFinishList
    const newRange = {
      startSegment: '1',
      endSegment: String(newTsUrlList.length),
    }
    rangeDownloadRef.current = newRange
    setTsUrlList(newTsUrlList)
    setFinishList(newFinishList)
    setRangeDownload(newRange)

    toast.success(t('parse.success', { count: newTsUrlList.length }))

    setEstimatedSize(null)
    void estimateFileSize(newTsUrlList, 1, newTsUrlList.length).then((size) => {
      if (size) setEstimatedSize(size)
    })
  }

  // ---- Direct video download ----
  const directDownload = async () => {
    if (!url || downloadState.isDownloading) return

    downloadAbortRef.current = new AbortController()

    const urlObj = new URL(url)
    const newTitle =
      urlObj.searchParams.get('title') ||
      title ||
      urlObj.pathname.split('/').pop()?.split('.')[0] ||
      format(new Date(), 'yyyyMMdd_HHmmss')
    setTitle(newTitle)

    setDownloadState((prev) => ({
      ...prev,
      isDownloading: true,
      isGetMP4: false,
    }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      isDownloading: true,
      isGetMP4: false,
    }

    setFinishList([{ title: url, status: 'downloading' }])

    try {
      const file = await fetchData(
        url,
        'file',
        downloadAbortRef.current?.signal,
      )

      if (!downloadStateRef.current.isDownloading) return

      const ext = getFileExtension(url)

      const blob = new Blob([file], {
        type: VIDEO_MIME_MAP[ext] || 'application/octet-stream',
      })
      const a = document.createElement('a')
      a.download = `${customFileName.trim() || newTitle}.${ext}`
      a.href = URL.createObjectURL(blob)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 100)

      setFinishList([{ title: url, status: 'finish' }])
      downloadStateRef.current = {
        ...downloadStateRef.current,
        isDownloading: false,
      }
      setDownloadState((s) => ({ ...s, isDownloading: false }))
      toast.success(t('download.directComplete'))
    } catch {
      if (!downloadStateRef.current.isDownloading) return
      setFinishList([{ title: url, status: 'error' }])
      downloadStateRef.current = {
        ...downloadStateRef.current,
        isDownloading: false,
      }
      setDownloadState((s) => ({ ...s, isDownloading: false }))
      toast.error(t('download.directFailed'))
    }
  }

  // ---- Parse URL (m3u8 or direct video) ----
  const parseM3U8 = async (targetUrl?: string) => {
    const fetchUrl = targetUrl || url
    if (!fetchUrl) {
      toast.error(t('parse.enterUrl'))
      return
    }

    setIsParsing(true)
    setTsUrlList([])
    setFinishList([])
    setVariants([])
    setEstimatedSize(null)
    setIsDirectVideo(false)
    tsUrlListRef.current = []
    finishListRef.current = []
    isDirectVideoRef.current = false
    m3u8ContentRef.current = ''

    // Direct video URL — no parsing needed
    if (isDirectVideoUrl(fetchUrl)) {
      setIsDirectVideo(true)
      isDirectVideoRef.current = true
      setIsParsing(false)

      // Estimate file size via HEAD request
      try {
        const res = await fetch(fetchUrl, { method: 'HEAD' })
        const len = res.headers.get('Content-Length')
        if (len) setEstimatedSize(Number.parseInt(len, 10))
      } catch {
        // ignore
      }

      toast.success(
        t('parse.directVideoDetected', {
          format: getFileExtension(fetchUrl).toUpperCase(),
        }),
      )
      return
    }

    if (fetchUrl.toLowerCase().indexOf('m3u8') === -1) {
      toast.error(t('parse.invalidUrl'))
      setIsParsing(false)
      return
    }

    try {
      const m3u8Str: string = await fetchData(fetchUrl)

      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, fetchUrl)
        if (parsedVariants.length > 0) {
          setVariants(parsedVariants)
          toast.info(
            t('parse.variantsDetected', { count: parsedVariants.length }),
          )
          await selectVariant(parsedVariants[0])
          return
        }
      }

      parseMediaPlaylist(m3u8Str, fetchUrl)
    } catch (error) {
      toast.error((error as any).message || t('parse.invalidLink'))
      logger.error('Parse m3u8 failed:', (error as any).message)
    } finally {
      setIsParsing(false)
    }
  }

  // ---- Select variant ----
  const selectVariant = async (variant: VariantStream) => {
    setIsLoadingVariant(true)
    setVariants((prev) =>
      prev.map((v) => ({ ...v, selected: v.url === variant.url })),
    )

    try {
      const m3u8Str: string = await fetchData(variant.url)

      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, variant.url)
        if (parsedVariants.length > 0) {
          setVariants(parsedVariants)
          toast.info(t('parse.continueSelect'))
          return
        }
      }

      parseMediaPlaylist(m3u8Str, variant.url)
    } catch (error) {
      toast.error(t('parse.variantFailed'))
      logger.error('Parse variant failed:', (error as any).message)
    } finally {
      setIsLoadingVariant(false)
    }
  }

  // ---- Start HLS segment download ----
  const startDownload = async (
    isGetMP4: boolean,
  ): Promise<void> => {
    // Read from refs to support immediate call after parseM3U8 (batch mode)
    const currentTsUrlList = tsUrlListRef.current.length > 0
      ? tsUrlListRef.current
      : tsUrlList
    const currentFinishList = finishListRef.current.length > 0
      ? finishListRef.current
      : finishList
    const currentRange = rangeDownloadRef.current

    if (currentTsUrlList.length === 0 || downloadState.isDownloading) return

    const completionPromise = new Promise<void>((resolve) => {
      downloadCompleteResolverRef.current = resolve
    })

    if (!isStreamModeRef.current) {
      isStreamModeRef.current = false
    }

    downloadAbortRef.current = new AbortController()

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)
    beginTimeRef.current = new Date()

    let startSeg = Math.max(parseInt(currentRange.startSegment) || 1, 1)
    let endSeg = Math.max(
      parseInt(currentRange.endSegment) || currentTsUrlList.length,
      1,
    )
    startSeg = Math.min(startSeg, currentTsUrlList.length)
    endSeg = Math.min(endSeg, currentTsUrlList.length)
    const newStartSegment = Math.min(startSeg, endSeg)
    const newEndSegment = Math.max(startSeg, endSeg)

    setRangeDownload({
      startSegment: String(newStartSegment),
      endSegment: String(newEndSegment),
    })

    const newFinishList = currentFinishList.map((item) => ({
      ...item,
      status: '' as const,
    }))
    setFinishList(newFinishList)

    setDownloadState((prev) => ({
      ...prev,
      downloadIndex: newStartSegment - 1,
      streamDownloadIndex: 0,
      isDownloading: true,
      isGetMP4,
    }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      downloadIndex: newStartSegment - 1,
      streamDownloadIndex: 0,
      isDownloading: true,
      isGetMP4,
    }

    mediaFileListRef.current = new Array(newEndSegment - newStartSegment + 1)

    const m3u8Str = m3u8ContentRef.current

    if (isGetMP4) {
      let infoIndex = 0
      let duration = 0
      m3u8Str.split('\n').forEach((item) => {
        if (item.toUpperCase().indexOf('#EXTINF:') > -1) {
          infoIndex++
          if (newStartSegment <= infoIndex && infoIndex <= newEndSegment) {
            duration += parseFloat(item.split('#EXTINF:')[1])
          }
        }
      })
      durationSecondRef.current = duration
    }

    if (m3u8Str.indexOf('#EXT-X-KEY') > -1) {
      const method = (m3u8Str.match(/(.*METHOD=([^,\s]+))/) || ['', '', ''])[2]
      const uri = (m3u8Str.match(/(.*URI="([^"]+))"/) || ['', '', ''])[2]
      const iv = (m3u8Str.match(/(.*IV=([^,\s]+))/) || ['', '', ''])[2]
      const newAesConf: AesConf = {
        ...aesConf,
        method,
        uri: applyURL(uri, url),
        iv: iv ? aesConf.stringToBuffer(iv) : '',
        decryptor: null,
      }
      setAesConf(newAesConf)
      aesConfRef.current = newAesConf

      await getAES(
        newAesConf,
        currentTsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    } else {
      await downloadTS(
        currentTsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    }

    return completionPromise
  }

  // ---- Cancel download ----
  const cancelDownload = () => {
    downloadAbortRef.current?.abort()
    downloadAbortRef.current = null
    isRetryingRef.current = false
    downloadCompleteResolverRef.current?.()
    downloadCompleteResolverRef.current = null

    setDownloadState((prev) => ({
      ...prev,
      isDownloading: false,
      isPaused: false,
      downloadIndex: 0,
      streamDownloadIndex: 0,
    }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      isDownloading: false,
      isPaused: false,
      downloadIndex: 0,
      streamDownloadIndex: 0,
    }
    downloadingTimestamps.current.clear()

    if (streamWriter.current) {
      streamWriter.current.abort?.().catch(() => {})
      streamWriter.current = null
    }
    isStreamModeRef.current = false

    setFinishList((prev) =>
      prev.map((item) => ({ ...item, status: '' as const })),
    )
    mediaFileListRef.current = []

    toast.info(t('download.cancelled'))
  }

  // ---- Pause / Resume ----
  const togglePause = () => {
    const newIsPaused = !downloadState.isPaused
    setDownloadState((prev) => ({ ...prev, isPaused: newIsPaused }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      isPaused: newIsPaused,
    }
    if (!newIsPaused) {
      retryAll(true)
    }
  }

  // ---- Retry single segment ----
  const retry = async (index: number) => {
    if (finishList[index].status !== 'error') return

    const startSegment = parseInt(rangeDownload.startSegment)
    const isGetMP4 = downloadStateRef.current.isGetMP4

    setFinishList((prev) => {
      const newList = [...prev]
      newList[index] = { ...newList[index], status: 'downloading' }
      return newList
    })
    downloadingTimestamps.current.set(index, Date.now())

    try {
      const file = await fetchData(tsUrlList[index], 'file')
      downloadingTimestamps.current.delete(index)
      await dealTS(file, index, startSegment, isGetMP4)
    } catch {
      downloadingTimestamps.current.delete(index)
      setFinishList((prev) => {
        const newList = [...prev]
        newList[index] = { ...newList[index], status: 'error' }
        return newList
      })
    }
  }

  // ---- Retry all failed segments ----
  const retryAll = (forceRestart: boolean) => {
    if (
      !finishList.length ||
      (!forceRestart && downloadStateRef.current.isPaused)
    ) {
      return
    }
    if (!downloadStateRef.current.isDownloading) return
    if (isRetryingRef.current && !forceRestart) return

    const startSegment = parseInt(rangeDownload.startSegment)
    const endSegment = parseInt(rangeDownload.endSegment)
    const isGetMP4 = downloadStateRef.current.isGetMP4
    let firstPendingIndex = endSegment
    const now = Date.now()
    let hasPending = false

    const newFinishList = finishList.map((item, index) => {
      if (index < startSegment - 1 || index >= endSegment) return item

      if (item.status === 'error') {
        firstPendingIndex = Math.min(firstPendingIndex, index)
        hasPending = true
        return { ...item, status: '' as const }
      }
      // Also handle items stuck at '' that are not actively downloading
      if (item.status === '' && !downloadingTimestamps.current.has(index)) {
        firstPendingIndex = Math.min(firstPendingIndex, index)
        hasPending = true
      }
      if (item.status === 'downloading') {
        const startedAt = downloadingTimestamps.current.get(index)
        if (
          startedAt &&
          now - startedAt > settingsRef.current.timeoutMs + 5_000
        ) {
          downloadingTimestamps.current.delete(index)
          firstPendingIndex = Math.min(firstPendingIndex, index)
          hasPending = true
          return { ...item, status: '' as const }
        }
      }
      return item
    })

    if (!hasPending) return

    setFinishList(newFinishList)

    if (downloadStateRef.current.downloadIndex >= endSegment || forceRestart) {
      isRetryingRef.current = true
      setDownloadState((prev) => ({
        ...prev,
        downloadIndex: firstPendingIndex,
      }))
      downloadStateRef.current = {
        ...downloadStateRef.current,
        downloadIndex: firstPendingIndex,
      }
      void downloadTS(
        tsUrlList,
        newFinishList,
        startSegment,
        endSegment,
        isGetMP4,
      ).finally(() => {
        isRetryingRef.current = false
      })
    }
  }

  // ---- Force download existing segments ----
  const forceDownload = () => {
    const currentMediaList = mediaFileListRef.current.filter(Boolean)
    if (currentMediaList.length) {
      triggerBrowserDownload(
        currentMediaList,
        customFileName.trim() ||
          title ||
          format(beginTimeRef.current, 'yyyyMMdd_HHmmss'),
        downloadState.isGetMP4,
      )
      toast.success(t('download.forceDownloadSuccess'))
    } else {
      toast.warning(t('download.noSegments'))
    }
  }

  // ---- Stream download (large files) ----
  const streamDownload = (isGetMP4: boolean) => {
    if (!isParsed || downloadState.isDownloading) return

    const streamSaver = (window as any).streamSaver
    if (!streamSaver) {
      toast.error(t('download.streamSaverNotLoaded'))
      return
    }

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)

    const fileName =
      customFileName.trim() || newTitle || format(new Date(), 'yyyyMMdd_HHmmss')
    const extension = isGetMP4 ? 'mp4' : 'ts'

    const writableStream = streamSaver.createWriteStream(
      `${fileName}.${extension}`,
    )
    streamWriter.current = writableStream.getWriter()
    isStreamModeRef.current = true

    void startDownload(isGetMP4)
  }

  const onRetryTick = useEffectEvent(() => {
    retryAll(false)
  })

  const onStreamSaverReady = useEffectEvent(() => {
    const streamSaver = (window as any).streamSaver
    if (streamSaver && !streamSaver.useBlobFallback) {
      streamSaver.middleTransporterUrl = `${window.location.origin}/static/mitm.html`
      setIsStreamSupported(true)
    }
  })

  // Re-estimate file size when segment range changes
  useEffect(() => {
    if (tsUrlList.length === 0) return

    const start = Math.max(parseInt(rangeDownload.startSegment) || 1, 1)
    const end = Math.max(
      parseInt(rangeDownload.endSegment) || tsUrlList.length,
      1,
    )

    setEstimatedSize(null)
    let cancelled = false
    void estimateFileSize(tsUrlList, start, end).then((size) => {
      if (!cancelled && size) setEstimatedSize(size)
    })
    return () => {
      cancelled = true
    }
  }, [rangeDownload.startSegment, rangeDownload.endSegment, tsUrlList])

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally load only on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url') || params.get('source')
    if (paramUrl && paramUrl.toLowerCase().includes('m3u8')) {
      setUrl(paramUrl)
      void parseM3U8(paramUrl)
    }

    const interval = setInterval(onRetryTick, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    return () => {
      aesConfRef.current.decryptor?.destroy()
      if (streamWriter.current) {
        streamWriter.current.abort?.().catch(() => {})
        streamWriter.current = null
      }
    }
  }, [])

  return {
    // State
    url,
    setUrl,
    customFileName,
    setCustomFileName,
    isParsing,
    isLoadingVariant,
    downloadState,
    finishList,
    tsUrlList,
    variants,
    isStreamSupported,
    estimatedSize,
    rangeDownload,
    setRangeDownload,
    finishNum,
    errorNum,
    targetSegment,
    isParsed,
    isDirectVideo,

    // Refs (needed by progress card for force download check)
    mediaFileListRef,
    streamWriter,

    // Actions
    parseM3U8,
    selectVariant,
    startDownload,
    directDownload,
    cancelDownload,
    togglePause,
    retry,
    forceDownload,
    streamDownload,
    onStreamSaverReady,
  }
}

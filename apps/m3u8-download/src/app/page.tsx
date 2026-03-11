'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cdlab996/ui/components/alert'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { ButtonGroup } from '@cdlab996/ui/components/button-group'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field, FieldTitle } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Progress } from '@cdlab996/ui/components/progress'
import { Slider } from '@cdlab996/ui/components/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { cn } from '@cdlab996/ui/lib/utils'
import { formatFileSize, logger } from '@cdlab996/utils'
import { format } from 'date-fns'
import {
  CircleQuestionMark,
  Download,
  HardDriveDownload,
  Loader2,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react'
import Script from 'next/script'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AESDecryptor } from '@/lib'

// ============================================================
// Types
// ============================================================

interface FinishItem {
  title: string
  status: '' | 'downloading' | 'finish' | 'error'
}

interface VariantStream {
  url: string
  bandwidth: number
  resolution: string
  name: string
  selected?: boolean
}

interface RangeDownload {
  startSegment: string
  endSegment: string
}

interface AesConf {
  method: string
  uri: string
  iv: string | Uint8Array
  key: ArrayBuffer | null
  decryptor: AESDecryptor | null
  stringToBuffer: (str: string) => Uint8Array
}

interface DownloadState {
  isDownloading: boolean
  isPaused: boolean
  isGetMP4: boolean
  downloadIndex: number
  streamDownloadIndex: number
}

// ============================================================
// Helpers
// ============================================================

const FETCH_TIMEOUT_MS = 30_000

const fetchData = async (
  url: string,
  type?: 'file' | 'text',
  signal?: AbortSignal,
): Promise<any> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return type === 'file'
      ? await response.arrayBuffer()
      : await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

const isMasterPlaylist = (m3u8Str: string): boolean =>
  m3u8Str.includes('#EXT-X-STREAM-INF')

const parseMasterPlaylistContent = (
  m3u8Str: string,
  baseURL: string,
): VariantStream[] => {
  const lines = m3u8Str.split('\n')
  const variants: VariantStream[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue

    const bandwidth = parseInt((line.match(/BANDWIDTH=(\d+)/) || ['', '0'])[1])
    const resolution = (line.match(/RESOLUTION=([^\s,]+)/) || ['', ''])[1]
    const name = (line.match(/NAME="([^"]*)"/) || ['', ''])[1]

    const nextLine = lines[i + 1]?.trim()
    if (nextLine && !nextLine.startsWith('#')) {
      variants.push({
        url: applyURL(nextLine, baseURL),
        bandwidth,
        resolution,
        name: name || resolution || `${Math.round(bandwidth / 1000)}kbps`,
      })
    }
  }

  return variants.sort((a, b) => b.bandwidth - a.bandwidth)
}

const applyURL = (targetURL: string, baseURL?: string) => {
  baseURL =
    baseURL || (typeof window !== 'undefined' ? window.location.href : '')
  if (targetURL.indexOf('http') === 0) {
    if (window.location.href.indexOf('https') === 0) {
      return targetURL.replace('http://', 'https://')
    }
    return targetURL
  }
  if (targetURL[0] === '/') {
    const domain = baseURL.split('/')
    return `${domain[0]}//${domain[2]}${targetURL}`
  }
  const domain = baseURL.split('/')
  domain.pop()
  return `${domain.join('/')}/${targetURL}`
}

const estimateFileSize = async (urlList: string[]): Promise<number | null> => {
  const total = urlList.length
  if (total === 0) return null

  // 抽样头、中、尾 3 个片段，用 HEAD 请求获取 Content-Length
  const sampleIndices = [0, Math.floor(total / 2), total - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  )

  const sizes: number[] = []
  for (const idx of sampleIndices) {
    try {
      const res = await fetch(urlList[idx], { method: 'HEAD' })
      const len = res.headers.get('Content-Length')
      if (len) sizes.push(Number.parseInt(len, 10))
    } catch {
      // 忽略失败的采样
    }
  }

  if (sizes.length === 0) return null
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
  return Math.round(avgSize * total)
}

const triggerBrowserDownload = (
  fileDataList: ArrayBuffer[],
  fileName: string,
  isMp4: boolean,
) => {
  const fileBlob = isMp4
    ? new Blob(fileDataList, { type: 'video/mp4' })
    : new Blob(fileDataList, { type: 'video/MP2T' })

  const extension = isMp4 ? '.mp4' : '.ts'
  const a = document.createElement('a')
  a.download = fileName + extension
  a.href = URL.createObjectURL(fileBlob)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 100)
}

// ============================================================
// Component
// ============================================================

export default function M3u8Downloader() {
  const [url, setUrl] = useState(
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  )
  const [title, setTitle] = useState('')
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

  // 是否已解析出片段（可以下载）
  const isParsed = tsUrlList.length > 0

  // ---- AES 解密 ----
  const aesDecrypt = (data: ArrayBuffer, index: number): ArrayBuffer => {
    const conf = aesConfRef.current
    const iv =
      conf.iv ||
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index])
    const ivBuffer = iv instanceof Uint8Array ? iv.buffer : iv
    return conf.decryptor!.decrypt(data, 0, ivBuffer as ArrayBuffer, true)
  }

  // ---- MP4 转码 ----
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
      logger.error('MP4 转码失败:', error)
      toast.error('MP4 转码失败，将使用原始 TS 格式')
      return data
    }
  }

  // ---- 处理单个 TS 片段 ----
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

      // 流式写入
      if (streamWriter.current) {
        // 直接从 ref 读取并同步更新，避免并发 updater 之间的竞态条件
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

        // 同步更新 ref，确保下一个批量执行的 updater 能读到最新值
        downloadStateRef.current = {
          ...downloadStateRef.current,
          streamDownloadIndex: currentStreamIndex,
        }
        setDownloadState((p) => ({
          ...p,
          streamDownloadIndex: currentStreamIndex,
        }))

        if (currentStreamIndex >= targetSegment) {
          streamWriter.current.close()
          streamWriter.current = null
          setDownloadState((s) => ({ ...s, isDownloading: false }))
          toast.success(`流式下载完成，共 ${newFinishNum} 个片段`)
        }
      } else if (!isStreamModeRef.current && newFinishNum === targetSegment) {
        const completeMediaList = mediaFileListRef.current.filter(Boolean)
        triggerBrowserDownload(
          completeMediaList,
          title || format(beginTimeRef.current, 'yyyyMMdd_HHmmss'),
          downloadStateRef.current.isGetMP4,
        )
        setDownloadState((s) => ({ ...s, isDownloading: false }))
        toast.success(`下载完成，共 ${newFinishNum} 个片段`)
      }

      return newList
    })
  }

  // ---- 并发下载 TS 片段（async worker pool） ----
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

        try {
          const file = await fetchData(
            urlList[index],
            'file',
            downloadAbortRef.current?.signal,
          )
          downloadingTimestamps.current.delete(index)
          if (!downloadStateRef.current.isDownloading) return
          await dealTS(file, index, startSegment, isGetMP4)
        } catch {
          downloadingTimestamps.current.delete(index)
          if (!downloadStateRef.current.isDownloading) return
          setFinishList((prev) => {
            const newList = [...prev]
            newList[index] = { ...newList[index], status: 'error' }

            const newErrorNum = newList.filter(
              (i) => i.status === 'error',
            ).length
            if (newErrorNum % 5 === 0 && newErrorNum > 0) {
              toast.warning(`已有 ${newErrorNum} 个片段下载失败，正在自动重试`)
            }
            return newList
          })
        }
      }
    }

    const concurrency = Math.min(6, targetSegment - finishNum)
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  }

  // ---- 获取 AES key 并初始化解密器 ----
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
      toast.error('视频已加密，无法下载')
      setDownloadState((prev) => ({ ...prev, isDownloading: false }))
    }
  }

  // ---- 解析媒体播放列表 ----
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
      toast.error('资源为空，请查看链接是否有效')
      return
    }

    m3u8ContentRef.current = m3u8Str
    setTsUrlList(newTsUrlList)
    setFinishList(newFinishList)
    setRangeDownload({
      startSegment: '1',
      endSegment: String(newTsUrlList.length),
    })

    toast.success(`解析成功，共 ${newTsUrlList.length} 个片段`)

    setEstimatedSize(null)
    void estimateFileSize(newTsUrlList).then((size) => {
      if (size) setEstimatedSize(size)
    })
  }

  // ---- 第一步：解析 m3u8 ----
  const parseM3U8 = async (targetUrl?: string) => {
    const fetchUrl = targetUrl || url
    if (!fetchUrl) {
      toast.error('请输入链接')
      return
    }
    if (fetchUrl.toLowerCase().indexOf('m3u8') === -1) {
      toast.error('链接有误，请重新输入')
      return
    }

    setIsParsing(true)
    // 重置之前的解析状态
    setTsUrlList([])
    setFinishList([])
    setVariants([])
    setEstimatedSize(null)
    m3u8ContentRef.current = ''

    try {
      const m3u8Str: string = await fetchData(fetchUrl)

      // 检测多码率主播放列表（Master Playlist）
      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, fetchUrl)
        if (parsedVariants.length > 0) {
          setVariants(parsedVariants)
          toast.info(
            `检测到 ${parsedVariants.length} 个清晰度，已默认选择最高码率`,
          )
          await selectVariant(parsedVariants[0])
          return
        }
      }

      parseMediaPlaylist(m3u8Str, fetchUrl)
    } catch (error) {
      toast.error((error as any).message || '链接不正确，请查看链接是否有效')
      logger.error('解析 m3u8 失败:', (error as any).message)
    } finally {
      setIsParsing(false)
    }
  }

  // ---- 选择清晰度（直接解析子播放列表） ----
  const selectVariant = async (variant: VariantStream) => {
    setIsLoadingVariant(true)
    setVariants((prev) =>
      prev.map((v) => ({ ...v, selected: v.url === variant.url })),
    )

    try {
      const m3u8Str: string = await fetchData(variant.url)

      // 极少数情况：子播放列表仍是 master playlist
      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, variant.url)
        if (parsedVariants.length > 0) {
          setVariants(parsedVariants)
          toast.info('请继续选择清晰度')
          return
        }
      }

      parseMediaPlaylist(m3u8Str, variant.url)
    } catch (error) {
      toast.error('解析所选清晰度失败，请重试')
      logger.error('解析子播放列表失败:', (error as any).message)
    } finally {
      setIsLoadingVariant(false)
    }
  }

  // ---- 第二步：开始下载 ----
  const startDownload = async (isGetMP4: boolean) => {
    if (!isParsed || downloadState.isDownloading) return

    // 仅在非流式调用时重置标记（streamDownload 会提前设置为 true）
    if (!isStreamModeRef.current) {
      isStreamModeRef.current = false
    }

    downloadAbortRef.current = new AbortController()

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)
    beginTimeRef.current = new Date()

    // 计算有效范围
    let startSeg = Math.max(parseInt(rangeDownload.startSegment) || 1, 1)
    let endSeg = Math.max(
      parseInt(rangeDownload.endSegment) || tsUrlList.length,
      1,
    )
    startSeg = Math.min(startSeg, tsUrlList.length)
    endSeg = Math.min(endSeg, tsUrlList.length)
    const newStartSegment = Math.min(startSeg, endSeg)
    const newEndSegment = Math.max(startSeg, endSeg)

    setRangeDownload({
      startSegment: String(newStartSegment),
      endSegment: String(newEndSegment),
    })

    // 重置 finishList 状态
    const newFinishList = finishList.map((item) => ({
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

    // 获取 MP4 视频总时长
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

    // 检测 AES 加密
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
        tsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    } else {
      await downloadTS(
        tsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    }
  }

  // ---- 取消下载 ----
  const cancelDownload = () => {
    // 中断所有进行中的请求
    downloadAbortRef.current?.abort()
    downloadAbortRef.current = null

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

    toast.info('已取消下载')
  }

  // ---- 暂停与恢复 ----
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

  // ---- 重新下载某个片段 ----
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

  // ---- 重新下载所有错误片段 ----
  const retryAll = (forceRestart: boolean) => {
    if (
      !finishList.length ||
      (!forceRestart && downloadStateRef.current.isPaused)
    ) {
      return
    }

    const startSegment = parseInt(rangeDownload.startSegment)
    const endSegment = parseInt(rangeDownload.endSegment)
    const isGetMP4 = downloadStateRef.current.isGetMP4
    let firstErrorIndex = downloadState.downloadIndex
    const now = Date.now()

    const newFinishList = finishList.map((item, index) => {
      if (item.status === 'error') {
        firstErrorIndex = Math.min(firstErrorIndex, index)
        return { ...item, status: '' as const }
      }
      // Reset stuck "downloading" segments
      if (item.status === 'downloading') {
        const startedAt = downloadingTimestamps.current.get(index)
        if (startedAt && now - startedAt > FETCH_TIMEOUT_MS + 5_000) {
          downloadingTimestamps.current.delete(index)
          firstErrorIndex = Math.min(firstErrorIndex, index)
          return { ...item, status: '' as const }
        }
      }
      return item
    })

    setFinishList(newFinishList)

    if (downloadState.downloadIndex >= endSegment || forceRestart) {
      setDownloadState((prev) => ({
        ...prev,
        downloadIndex: firstErrorIndex,
      }))
      downloadStateRef.current = {
        ...downloadStateRef.current,
        downloadIndex: firstErrorIndex,
      }
      void downloadTS(
        tsUrlList,
        newFinishList,
        startSegment,
        endSegment,
        isGetMP4,
      )
    } else {
      setDownloadState((prev) => ({
        ...prev,
        downloadIndex: firstErrorIndex,
      }))
    }
  }

  // ---- 强制下载现有片段 ----
  const forceDownload = () => {
    const currentMediaList = mediaFileListRef.current.filter(Boolean)
    if (currentMediaList.length) {
      triggerBrowserDownload(
        currentMediaList,
        title || format(beginTimeRef.current, 'yyyyMMdd_HHmmss'),
        downloadState.isGetMP4,
      )
      toast.success('已触发浏览器下载现有片段')
    } else {
      toast.warning('当前无已下载片段')
    }
  }

  // ---- 流式下载（大文件） ----
  const streamDownload = (isGetMP4: boolean) => {
    if (!isParsed || downloadState.isDownloading) return

    const streamSaver = (window as any).streamSaver
    if (!streamSaver) {
      toast.error('StreamSaver 未加载，无法使用流式下载')
      return
    }

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)

    const fileName = newTitle || format(new Date(), 'yyyyMMdd_HHmmss')
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

  return (
    <IKPageContainer scrollable={false}>
      <Script
        src="/static/StreamSaver.js"
        strategy="afterInteractive"
        onLoad={onStreamSaverReady}
      />
      <div className="w-full h-full flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>M3U8 在线下载工具</CardTitle>
            <CardDescription>
              支持范围下载、流式下载、AES 解密、转 MP4
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field>
              <FieldTitle>m3u8 链接</FieldTitle>
              <div className="flex gap-2">
                <Input
                  id="m3u8-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void parseM3U8()
                  }}
                  disabled={downloadState.isDownloading}
                  placeholder="https://example.com/playlist.m3u8"
                  className="text-base"
                />
                <Button
                  onClick={() => void parseM3U8()}
                  disabled={
                    isParsing || downloadState.isDownloading || !url.trim()
                  }
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      解析中
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      解析
                    </>
                  )}
                </Button>
              </div>
            </Field>

            {variants.length > 0 && (
              <Field>
                <FieldTitle>检测到多个清晰度，请选择：</FieldTitle>
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v) => (
                    <Button
                      key={v.url}
                      variant={v.selected ? 'default' : 'outline'}
                      size="sm"
                      disabled={isLoadingVariant || downloadState.isDownloading}
                      onClick={() => selectVariant(v)}
                    >
                      {v.name}
                      {v.resolution && ` (${v.resolution})`}
                      {v.bandwidth > 0 &&
                        ` · ${(v.bandwidth / 1_000_000).toFixed(1)}Mbps`}
                    </Button>
                  ))}
                </div>
              </Field>
            )}

            {isParsed && (
              <Field>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <FieldTitle>
                    下载范围
                    {tsUrlList.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        (共 {tsUrlList.length} 个片段
                        {estimatedSize !== null &&
                          `，预估 ${formatFileSize(estimatedSize)}`}
                        )
                      </span>
                    )}
                  </FieldTitle>
                  <span className="text-sm text-muted-foreground shrink-0">
                    <span className="font-medium tabular-nums">
                      {rangeDownload.startSegment}
                    </span>
                    {' ~ '}
                    <span className="font-medium tabular-nums">
                      {rangeDownload.endSegment}
                    </span>
                  </span>
                </div>
                <Slider
                  value={[
                    parseInt(rangeDownload.startSegment) || 1,
                    parseInt(rangeDownload.endSegment) || tsUrlList.length,
                  ]}
                  onValueChange={(value) =>
                    setRangeDownload({
                      startSegment: String(value[0]),
                      endSegment: String(value[1]),
                    })
                  }
                  min={1}
                  max={tsUrlList.length}
                  step={1}
                  disabled={downloadState.isDownloading}
                  className="mt-2"
                  aria-label="下载范围"
                />
              </Field>
            )}
          </CardContent>

          {isParsed && (
            <CardFooter className="flex-col sm:flex-row gap-4 items-start">
              {!downloadState.isDownloading ? (
                <>
                  <Field>
                    <FieldTitle>普通下载</FieldTitle>
                    <ButtonGroup>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void startDownload(false)}
                      >
                        <HardDriveDownload className="size-4" />
                        原格式 (.ts)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void startDownload(true)}
                      >
                        <HardDriveDownload className="size-4" />
                        转码 MP4
                      </Button>
                    </ButtonGroup>
                  </Field>

                  {isStreamSupported && (
                    <Field>
                      <FieldTitle>
                        大文件流式下载
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CircleQuestionMark className="size-4 cursor-help text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                边下载边保存，解决大文件内存不足问题
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FieldTitle>
                      <ButtonGroup>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => streamDownload(false)}
                        >
                          <HardDriveDownload className="size-4" />
                          原格式 (.ts)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => streamDownload(true)}
                        >
                          <HardDriveDownload className="size-4" />
                          转码 MP4
                        </Button>
                      </ButtonGroup>
                    </Field>
                  )}
                </>
              ) : (
                <ButtonGroup>
                  <Button
                    onClick={togglePause}
                    variant={downloadState.isPaused ? 'default' : 'secondary'}
                  >
                    {downloadState.isPaused ? (
                      <>
                        <Play className="size-4" />
                        继续下载
                      </>
                    ) : (
                      <>
                        <Pause className="size-4" />
                        暂停下载
                      </>
                    )}
                  </Button>
                  <Button variant="destructive" onClick={cancelDownload}>
                    <X className="size-4" />
                    取消下载
                  </Button>
                </ButtonGroup>
              )}
            </CardFooter>
          )}
        </Card>

        <Card className="flex flex-col p-4 border-none h-full">
          <CardHeader className="p-0">
            <CardTitle>下载进度</CardTitle>
            {finishList.length > 0 && (
              <CardDescription>总片段数：{targetSegment}</CardDescription>
            )}
            <CardAction>
              {finishList.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm space-x-2">
                    <Badge variant="outline">已完成 {finishNum}</Badge>
                    {errorNum > 0 && (
                      <Badge variant="destructive">失败 {errorNum}</Badge>
                    )}
                  </div>

                  {mediaFileListRef.current.some(Boolean) &&
                    !streamWriter.current && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={forceDownload}
                      >
                        <Download className="size-4" />
                        下载已完成片段
                      </Button>
                    )}
                </div>
              )}
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4 p-0 overflow-hidden">
            {finishList.length > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>整体进度</span>
                    <span className="font-medium">
                      {((finishNum / targetSegment) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={(finishNum / targetSegment) * 100}
                    className="h-2.5"
                  />
                </div>

                {errorNum > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>部分片段下载失败</AlertTitle>
                    <AlertDescription>
                      红色格子可点击重试 • 系统每 2 秒自动重试一次
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex-1">
                  <TooltipProvider>
                    <div
                      className={
                        'grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] p-0.5 gap-2'
                      }
                    >
                      {finishList.map((item, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => retry(index)}
                              disabled={item.status !== 'error'}
                              className={cn(
                                'aspect-square rounded-md border font-medium',
                                'text-xs sm:text-sm',
                                'transition-all duration-150 shadow-sm',
                                'flex items-center justify-center',
                                item.status === 'finish' &&
                                  'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white',
                                item.status === 'error' &&
                                  'bg-red-600 hover:bg-red-700 border-red-700 text-white cursor-pointer hover:scale-105',
                                item.status === 'downloading' &&
                                  'bg-blue-600 animate-pulse border-blue-700 text-white',
                                item.status === '' &&
                                  'bg-muted hover:bg-muted/80 border-border text-muted-foreground',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                              )}
                            >
                              {index + 1}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs wrap-break-word">
                              {item.title || `片段 ${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.status === 'finish'
                                ? '已完成'
                                : item.status === 'error'
                                  ? '点击重试'
                                  : item.status === 'downloading'
                                    ? '下载中...'
                                    : '等待下载'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              </>
            ) : (
              <IKEmpty
                title="暂无下载任务"
                description="输入 M3U8 链接，点击解析按钮开始"
                hint="支持范围下载、流式下载、AES 解密和 MP4 转码"
                icon={Download}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </IKPageContainer>
  )
}

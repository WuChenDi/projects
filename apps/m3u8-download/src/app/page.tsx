'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cdlab996/ui/components/alert'
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cdlab996/ui/components/empty'
import { Field } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Progress } from '@cdlab996/ui/components/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { cn } from '@cdlab996/ui/lib/utils'
import { logger } from '@cdlab996/utils'
import { format } from 'date-fns'
import { Download, Pause, Play } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout'
import { useStreamSaver } from '@/hooks/useStreamSaver'
import { AESDecryptor } from '@/lib'

// ============================================================
// Types
// ============================================================

interface FinishItem {
  title: string
  status: '' | 'downloading' | 'finish' | 'error'
}

interface RangeDownload {
  isShowRange: boolean
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

const fetchData = async (url: string, type?: 'file' | 'text'): Promise<any> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return type === 'file' ? response.arrayBuffer() : response.text()
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
  const {
    isLoaded: streamSaverLoaded,
    isSupported: streamSaverSupported,
    streamSaver,
  } = useStreamSaver()

  const [url, setUrl] = useState(
    'https://vv.jisuzyv.com/play/hls/e5yy3ZRe/index.m3u8',
  )
  const [title, setTitle] = useState('')

  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    isPaused: false,
    isGetMP4: false,
    downloadIndex: 0,
    streamDownloadIndex: 0,
  })

  const [finishList, setFinishList] = useState<FinishItem[]>([])
  const [tsUrlList, setTsUrlList] = useState<string[]>([])

  const streamWriter = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null,
  )

  const [rangeDownload, setRangeDownload] = useState<RangeDownload>({
    isShowRange: false,
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

  const isSupperStreamWrite = useMemo(() => {
    return streamSaverLoaded && streamSaverSupported
  }, [streamSaverLoaded, streamSaverSupported])

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

        setDownloadState((p) => ({
          ...p,
          streamDownloadIndex: currentStreamIndex,
        }))

        if (currentStreamIndex >= targetSegment) {
          streamWriter.current.close()
          toast.success(`流式下载完成，共 ${newFinishNum} 个片段`)
        }
      } else if (newFinishNum === targetSegment) {
        const completeMediaList = mediaFileListRef.current.filter(Boolean)
        triggerBrowserDownload(
          completeMediaList,
          title || format(beginTimeRef.current, 'yyyy_MM_dd_HH_mm_ss'),
          downloadStateRef.current.isGetMP4,
        )
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
        if (downloadStateRef.current.isPaused) return

        const index = next()
        if (index === null) return

        if (finishItems[index]?.status !== '') continue

        setFinishList((prev) => {
          const newList = [...prev]
          newList[index] = { ...newList[index], status: 'downloading' }
          return newList
        })

        try {
          const file = await fetchData(urlList[index], 'file')
          await dealTS(file, index, startSegment, isGetMP4)
        } catch {
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

  // ---- 主入口：解析 m3u8 并开始下载 ----
  const getM3U8 = async (onlyGetRange: boolean) => {
    if (!url) {
      toast.error('请输入链接')
      return
    }
    if (url.toLowerCase().indexOf('m3u8') === -1) {
      toast.error('链接有误，请重新输入')
      return
    }
    if (downloadState.isDownloading) {
      toast.warning('资源下载中，请稍后')
      return
    }

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)
    beginTimeRef.current = new Date()

    toast.info('正在解析 m3u8 文件')

    try {
      const m3u8Str: string = await fetchData(url)

      const newTsUrlList: string[] = []
      const newFinishList: FinishItem[] = []

      m3u8Str.split('\n').forEach((item) => {
        if (/^[^#]/.test(item) && item.trim()) {
          newTsUrlList.push(applyURL(item, url))
          newFinishList.push({ title: item, status: '' })
        }
      })

      setTsUrlList(newTsUrlList)
      setFinishList(newFinishList)

      if (onlyGetRange) {
        setRangeDownload({
          isShowRange: true,
          endSegment: String(newTsUrlList.length),
          startSegment: '1',
        })
        return
      }

      // 计算有效范围
      let startSeg = Math.max(parseInt(rangeDownload.startSegment) || 1, 1)
      let endSeg = Math.max(
        parseInt(rangeDownload.endSegment) || newTsUrlList.length,
        1,
      )
      startSeg = Math.min(startSeg, newTsUrlList.length)
      endSeg = Math.min(endSeg, newTsUrlList.length)
      const newStartSegment = Math.min(startSeg, endSeg)
      const newEndSegment = Math.max(startSeg, endSeg)

      setRangeDownload((prev) => ({
        ...prev,
        startSegment: String(newStartSegment),
        endSegment: String(newEndSegment),
      }))
      setDownloadState((prev) => ({
        ...prev,
        downloadIndex: newStartSegment - 1,
        isDownloading: true,
      }))

      mediaFileListRef.current = new Array(newEndSegment - newStartSegment + 1)

      const isGetMP4 = downloadStateRef.current.isGetMP4

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
        const method = (m3u8Str.match(/(.*METHOD=([^,\s]+))/) || [
          '',
          '',
          '',
        ])[2]
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
          newTsUrlList,
          newFinishList,
          newStartSegment,
          newEndSegment,
          isGetMP4,
        )
      } else if (newTsUrlList.length > 0) {
        await downloadTS(
          newTsUrlList,
          newFinishList,
          newStartSegment,
          newEndSegment,
          isGetMP4,
        )
      } else {
        toast.error('资源为空，请查看链接是否有效')
        setDownloadState((prev) => ({ ...prev, isDownloading: false }))
      }
    } catch (error) {
      toast.error((error as any).message || '链接不正确，请查看链接是否有效')
      logger.error('解析 m3u8 失败:', (error as any).message)
      setDownloadState((prev) => ({ ...prev, isDownloading: false }))
    }
  }

  // ---- 流式下载 ----
  const streamDownload = (isMp4: boolean) => {
    if (!streamSaver) {
      toast.error('流式下载功能未就绪，请刷新页面重试')
      return
    }

    setDownloadState((prev) => ({ ...prev, isGetMP4: isMp4 }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      isGetMP4: isMp4,
    }

    const urlObj = new URL(url)
    const newTitle = urlObj.searchParams.get('title') || title
    setTitle(newTitle)

    const fileName = newTitle || format(new Date(), 'yyyy_MM_dd HH_mm_ss')
    const finalFileName =
      document.title !== 'm3u8 downloader' ? document.title : fileName

    try {
      const writer = streamSaver
        .createWriteStream(`${finalFileName}.${isMp4 ? 'mp4' : 'ts'}`)
        .getWriter()

      streamWriter.current = writer
      toast.info('开始流式下载（边下边存）')
      void getM3U8(false)
    } catch (error) {
      toast.error('创建流式下载失败')
      console.error(error)
    }
  }

  // ---- 转码 MP4 下载 ----
  const getMP4 = () => {
    setDownloadState((prev) => ({ ...prev, isGetMP4: true }))
    downloadStateRef.current = {
      ...downloadStateRef.current,
      isGetMP4: true,
    }
    void getM3U8(false)
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
      newList[index] = { ...newList[index], status: '' }
      return newList
    })

    try {
      const file = await fetchData(tsUrlList[index], 'file')
      await dealTS(file, index, startSegment, isGetMP4)
    } catch {
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

    const newFinishList = finishList.map((item, index) => {
      if (item.status === 'error') {
        firstErrorIndex = Math.min(firstErrorIndex, index)
        return { ...item, status: '' as const }
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
        title || format(beginTimeRef.current, 'yyyy_MM_dd_HH_mm_ss'),
        downloadState.isGetMP4,
      )
      toast.success('已触发浏览器下载现有片段')
    } else {
      toast.warning('当前无已下载片段')
    }
  }

  const onEnterKey = useEffectEvent(() => {
    void getM3U8(false)
  })

  const onRetryTick = useEffectEvent(() => {
    retryAll(false)
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const href = window.location.href
      if (href.indexOf('?source=') > -1) {
        setUrl(href.split('?source=')[1])
      }
    }

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.keyCode === 13) {
        onEnterKey()
      }
    }
    window.addEventListener('keyup', handleKeyup)

    const interval = setInterval(onRetryTick, 2000)

    return () => {
      window.removeEventListener('keyup', handleKeyup)
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
    <PageContainer scrollable={false}>
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* 左侧控制面板 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>M3U8 在线下载工具</CardTitle>
              <CardDescription>
                支持范围下载、流式下载、AES 解密、转 MP4
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Field>
                  <Label htmlFor="m3u8-url">m3u8 链接</Label>
                  <Input
                    id="m3u8-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={downloadState.isDownloading}
                    placeholder="https://example.com/playlist.m3u8"
                    className="text-base"
                  />
                </Field>

                {rangeDownload.isShowRange && (
                  <div className="flex gap-3">
                    <Field>
                      <Label>起始片段</Label>
                      <Input
                        type="number"
                        min={1}
                        value={rangeDownload.startSegment}
                        onChange={(e) =>
                          setRangeDownload((prev) => ({
                            ...prev,
                            startSegment: e.target.value,
                          }))
                        }
                        disabled={downloadState.isDownloading}
                      />
                    </Field>
                    <Field>
                      <Label>结束片段</Label>
                      <Input
                        type="number"
                        min={1}
                        value={rangeDownload.endSegment}
                        onChange={(e) =>
                          setRangeDownload((prev) => ({
                            ...prev,
                            endSegment: e.target.value,
                          }))
                        }
                        disabled={downloadState.isDownloading}
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!downloadState.isDownloading ? (
                  <>
                    {!rangeDownload.isShowRange ? (
                      <Button
                        onClick={() => getM3U8(true)}
                        variant="outline"
                        className="w-full"
                      >
                        选择范围下载
                      </Button>
                    ) : (
                      <Button
                        onClick={() => getM3U8(false)}
                        variant="secondary"
                        className="w-full"
                      >
                        取消范围选择
                      </Button>
                    )}

                    <Button onClick={() => getM3U8(false)} className="w-full">
                      原格式下载 (.ts)
                    </Button>

                    <Button onClick={getMP4} className="w-full">
                      转码 MP4 下载
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={togglePause}
                    size="lg"
                    variant={downloadState.isPaused ? 'default' : 'destructive'}
                    className="w-full"
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
                )}
              </div>

              {!streamSaverLoaded && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    正在加载流式下载功能...
                  </p>
                </div>
              )}

              {!downloadState.isDownloading &&
                streamSaverLoaded &&
                isSupperStreamWrite && (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm text-muted-foreground">
                      超大视频建议使用流式下载（占内存占用小）
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => streamDownload(false)}
                        variant="outline"
                        className="w-full"
                      >
                        流式原格式下载 (.ts)
                      </Button>
                      <Button
                        onClick={() => streamDownload(true)}
                        className="w-full"
                      >
                        流式 MP4 下载
                      </Button>
                    </div>
                  </div>
                )}

              {streamSaverLoaded && !isSupperStreamWrite && (
                <div className="pt-4 border-t">
                  <Alert>
                    <AlertDescription>
                      当前浏览器不支持流式下载（Safari），将使用普通下载方式。
                      建议使用 Chrome、Firefox 或 Edge 浏览器以获得更好体验。
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              <Empty className="flex-1">
                <EmptyMedia variant="icon">
                  <Download className="size-5" />
                </EmptyMedia>

                <EmptyHeader>
                  <EmptyTitle>暂无下载任务</EmptyTitle>
                  <EmptyDescription>
                    输入 M3U8 链接开始下载视频片段
                  </EmptyDescription>
                </EmptyHeader>

                <EmptyContent>
                  <p className="text-xs text-muted-foreground/80">
                    支持范围下载、流式下载、AES 解密和 MP4 转码
                  </p>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

import { downloadFile, logger } from '@cdlab/utils'
import { format } from 'date-fns'
import type { AesConf, DownloadStore } from '@/stores/download-store'
import type { DownloadSettings } from '@/stores/settings-store'
import { AESDecryptor } from './aes-decryptor'
import { isMasterPlaylist, parseMasterPlaylistContent } from './m3u8-parser'
import type { FinishItem, VariantStream } from './video-utils'
import {
  applyURL,
  estimateFileSize,
  fetchData,
  getFileExtension,
  isDirectVideoUrl,
  triggerBrowserDownload,
  VIDEO_MIME_MAP,
} from './video-utils'

export interface EngineNotifier {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
  info: (msg: string) => void
}

type StoreApi = {
  getState: () => DownloadStore
  setState: (
    partial:
      | Partial<DownloadStore>
      | ((state: DownloadStore) => Partial<DownloadStore>),
  ) => void
}

export class DownloadEngine {
  // Non-serializable internal state (class fields, NOT in store)
  private mediaFileList: ArrayBuffer[] = []
  private streamWriter: WritableStreamDefaultWriter<Uint8Array> | null = null
  private abortController: AbortController | null = null
  private downloadingTimestamps = new Map<number, number>()
  private beginTime = new Date()
  private durationSecond = 0
  private isRetrying = false
  private isStreamMode = false

  constructor(
    private store: StoreApi,
    private getSettings: () => DownloadSettings,
    private notify: EngineNotifier,
  ) {}

  // ============================================================
  // Parse
  // ============================================================

  async parseM3U8(targetUrl: string): Promise<void> {
    const s = this.store.getState()
    if (!targetUrl) {
      this.notify.error('enterUrl')
      return
    }

    s.setIsParsing(true)
    s.setTsUrlList([])
    s.setFinishList([])
    s.setVariants([])
    s.setEstimatedSize(null)
    s.setIsDirectVideo(false)
    s.setM3u8Content('')
    s.setHasMediaData(false)

    if (isDirectVideoUrl(targetUrl)) {
      s.setIsDirectVideo(true)
      s.setIsParsing(false)
      try {
        const res = await fetch(targetUrl, { method: 'HEAD' })
        const len = res.headers.get('Content-Length')
        if (len) s.setEstimatedSize(Number.parseInt(len, 10))
      } catch {
        // ignore
      }
      this.notify.success(
        `directVideoDetected:${getFileExtension(targetUrl).toUpperCase()}`,
      )
      return
    }

    if (targetUrl.toLowerCase().indexOf('m3u8') === -1) {
      this.notify.error('invalidUrl')
      s.setIsParsing(false)
      return
    }

    try {
      const m3u8Str: string = await fetchData(targetUrl)

      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, targetUrl)
        if (parsedVariants.length > 0) {
          s.setVariants(parsedVariants)
          this.notify.info(`variantsDetected:${parsedVariants.length}`)
          await this.selectVariant(parsedVariants[0])
          return
        }
      }

      this.parseMediaPlaylist(m3u8Str, targetUrl)
    } catch (error) {
      this.notify.error((error as any).message || 'invalidLink')
      logger.error('Parse m3u8 failed:', (error as any).message)
    } finally {
      s.setIsParsing(false)
    }
  }

  async selectVariant(variant: VariantStream): Promise<void> {
    const s = this.store.getState()
    s.setIsLoadingVariant(true)
    s.updateVariantSelection(variant.url)

    try {
      const m3u8Str: string = await fetchData(variant.url)

      if (isMasterPlaylist(m3u8Str)) {
        const parsedVariants = parseMasterPlaylistContent(m3u8Str, variant.url)
        if (parsedVariants.length > 0) {
          s.setVariants(parsedVariants)
          this.notify.info('continueSelect')
          return
        }
      }

      this.parseMediaPlaylist(m3u8Str, variant.url)
    } catch (error) {
      this.notify.error('variantFailed')
      logger.error('Parse variant failed:', (error as any).message)
    } finally {
      s.setIsLoadingVariant(false)
    }
  }

  private parseMediaPlaylist(m3u8Str: string, baseURL: string) {
    const s = this.store.getState()
    const newTsUrlList: string[] = []
    const newFinishList: FinishItem[] = []

    m3u8Str.split('\n').forEach((item) => {
      if (/^[^#]/.test(item) && item.trim()) {
        newTsUrlList.push(applyURL(item, baseURL))
        newFinishList.push({ title: item, status: '' })
      }
    })

    if (newTsUrlList.length === 0) {
      this.notify.error('emptyResource')
      return
    }

    s.setM3u8Content(m3u8Str)
    s.setTsUrlList(newTsUrlList)
    s.setFinishList(newFinishList)
    s.setRangeDownload({
      startSegment: '1',
      endSegment: String(newTsUrlList.length),
    })

    this.notify.success(`success:${newTsUrlList.length}`)

    s.setEstimatedSize(null)
    void estimateFileSize(newTsUrlList, 1, newTsUrlList.length).then((size) => {
      if (size) s.setEstimatedSize(size)
    })
  }

  // ============================================================
  // Download
  // ============================================================

  async startDownload(isGetMP4: boolean): Promise<void> {
    const s = this.store.getState()
    if (s.tsUrlList.length === 0 || s.downloadState.isDownloading) {
      return Promise.reject(new Error('Cannot start download'))
    }

    this.abortController = new AbortController()
    this.isStreamMode = false

    const urlObj = new URL(s.url)
    const newTitle = urlObj.searchParams.get('title') || s.title
    s.setTitle(newTitle)
    this.beginTime = new Date()

    const range = s.rangeDownload
    let startSeg = Math.max(parseInt(range.startSegment) || 1, 1)
    let endSeg = Math.max(parseInt(range.endSegment) || s.tsUrlList.length, 1)
    startSeg = Math.min(startSeg, s.tsUrlList.length)
    endSeg = Math.min(endSeg, s.tsUrlList.length)
    const newStartSegment = Math.min(startSeg, endSeg)
    const newEndSegment = Math.max(startSeg, endSeg)

    s.setRangeDownload({
      startSegment: String(newStartSegment),
      endSegment: String(newEndSegment),
    })

    const newFinishList = s.finishList.map((item) => ({
      ...item,
      status: '' as const,
    }))
    s.setFinishList(newFinishList)

    s.setDownloadState({
      downloadIndex: newStartSegment - 1,
      streamDownloadIndex: 0,
      isDownloading: true,
      isGetMP4,
    })

    this.mediaFileList = new Array(newEndSegment - newStartSegment + 1)
    s.setHasMediaData(false)

    const m3u8Str = s.m3u8Content

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
      this.durationSecond = duration
    }

    if (m3u8Str.indexOf('#EXT-X-KEY') > -1) {
      const method = (m3u8Str.match(/(.*METHOD=([^,\s]+))/) || ['', '', ''])[2]
      const uri = (m3u8Str.match(/(.*URI="([^"]+))"/) || ['', '', ''])[2]
      const iv = (m3u8Str.match(/(.*IV=([^,\s]+))/) || ['', '', ''])[2]
      const newAesConf: AesConf = {
        method,
        uri: applyURL(uri, s.url),
        iv: iv ? new TextEncoder().encode(iv) : '',
        key: null,
        decryptor: null,
      }
      s.setAesConf(newAesConf)

      await this.getAES(
        newAesConf,
        s.tsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    } else {
      await this.downloadTS(
        s.tsUrlList,
        newFinishList,
        newStartSegment,
        newEndSegment,
        isGetMP4,
      )
    }

    // After worker pool finishes, check completion
    this.checkCompletion()
  }

  async directDownload(): Promise<void> {
    const s = this.store.getState()
    if (!s.url || s.downloadState.isDownloading) return

    this.abortController = new AbortController()
    const urlObj = new URL(s.url)
    const newTitle =
      urlObj.searchParams.get('title') ||
      s.title ||
      urlObj.pathname.split('/').pop()?.split('.')[0] ||
      format(new Date(), 'yyyyMMdd_HHmmss')
    s.setTitle(newTitle)
    s.setDownloadState({ isDownloading: true, isGetMP4: false })
    s.setFinishList([{ title: s.url, status: 'downloading' }])

    try {
      const file = await fetchData(s.url, 'file', this.abortController?.signal)
      if (!this.store.getState().downloadState.isDownloading) return

      const ext = getFileExtension(s.url)
      const blob = new Blob([file], {
        type: VIDEO_MIME_MAP[ext] || 'application/octet-stream',
      })
      const filename = `${this.store.getState().customFileName || newTitle}.${ext}`
      downloadFile({ data: blob, filename })

      s.setFinishList([{ title: s.url, status: 'finish' }])
      s.setDownloadState({ isDownloading: false })
      this.notify.success('directComplete')
    } catch {
      if (!this.store.getState().downloadState.isDownloading) return
      s.setFinishList([{ title: s.url, status: 'error' }])
      s.setDownloadState({ isDownloading: false })
      this.notify.error('directFailed')
    }
  }

  streamDownload(isGetMP4: boolean): Promise<void> {
    const s = this.store.getState()
    if (s.tsUrlList.length === 0 || s.downloadState.isDownloading) {
      return Promise.reject(new Error('Cannot start stream download'))
    }

    const streamSaver = (window as any).streamSaver
    if (!streamSaver) {
      this.notify.error('streamSaverNotLoaded')
      return Promise.reject(new Error('StreamSaver not loaded'))
    }

    const urlObj = new URL(s.url)
    const newTitle = urlObj.searchParams.get('title') || s.title
    s.setTitle(newTitle)

    const fileName =
      s.customFileName || newTitle || format(new Date(), 'yyyyMMdd_HHmmss')
    const extension = isGetMP4 ? 'mp4' : 'ts'

    const writableStream = streamSaver.createWriteStream(
      `${fileName}.${extension}`,
    )
    this.streamWriter = writableStream.getWriter()
    this.isStreamMode = true
    s.setHasStreamWriter(true)

    return this.startDownload(isGetMP4)
  }

  cancelDownload(): void {
    const s = this.store.getState()
    this.abortController?.abort()
    this.abortController = null
    this.isRetrying = false

    s.setDownloadState({
      isDownloading: false,
      isPaused: false,
      downloadIndex: 0,
      streamDownloadIndex: 0,
    })
    this.downloadingTimestamps.clear()

    if (this.streamWriter) {
      this.streamWriter.abort?.().catch(() => {})
      this.streamWriter = null
      s.setHasStreamWriter(false)
    }
    this.isStreamMode = false

    s.setFinishList(
      s.finishList.map((item) => ({ ...item, status: '' as const })),
    )
    this.mediaFileList = []
    s.setHasMediaData(false)

    this.notify.info('cancelled')
  }

  togglePause(): void {
    const s = this.store.getState()
    const newIsPaused = !s.downloadState.isPaused
    s.setDownloadState({ isPaused: newIsPaused })
    if (!newIsPaused) {
      this.retryAll(true)
    }
  }

  async retry(index: number): Promise<void> {
    const s = this.store.getState()
    if (s.finishList[index]?.status !== 'error') return

    const startSegment = parseInt(s.rangeDownload.startSegment)
    const isGetMP4 = s.downloadState.isGetMP4

    s.updateFinishItem(index, 'downloading')
    this.downloadingTimestamps.set(index, Date.now())

    try {
      const file = await fetchData(s.tsUrlList[index], 'file')
      this.downloadingTimestamps.delete(index)
      await this.dealTS(file, index, startSegment, isGetMP4)
    } catch {
      this.downloadingTimestamps.delete(index)
      s.updateFinishItem(index, 'error')
    }
  }

  forceDownload(): void {
    const s = this.store.getState()
    const currentMediaList = this.mediaFileList.filter(Boolean)
    if (currentMediaList.length) {
      triggerBrowserDownload(
        currentMediaList,
        s.customFileName ||
          s.title ||
          format(this.beginTime, 'yyyyMMdd_HHmmss'),
        s.downloadState.isGetMP4,
      )
      this.notify.success('forceDownloadSuccess')
    } else {
      this.notify.warning('noSegments')
    }
  }

  retryAll(forceRestart: boolean): void {
    const s = this.store.getState()
    const ds = s.downloadState

    if (!s.finishList.length || (!forceRestart && ds.isPaused)) return
    if (!ds.isDownloading) return
    if (this.isRetrying && !forceRestart) return

    const startSegment = parseInt(s.rangeDownload.startSegment)
    const endSegment = parseInt(s.rangeDownload.endSegment)
    const isGetMP4 = ds.isGetMP4
    let firstPendingIndex = endSegment
    const now = Date.now()
    let hasPending = false
    const settings = this.getSettings()

    const newFinishList = s.finishList.map((item, index) => {
      if (index < startSegment - 1 || index >= endSegment) return item

      if (item.status === 'error') {
        firstPendingIndex = Math.min(firstPendingIndex, index)
        hasPending = true
        return { ...item, status: '' as const }
      }
      if (item.status === '' && !this.downloadingTimestamps.has(index)) {
        firstPendingIndex = Math.min(firstPendingIndex, index)
        hasPending = true
      }
      if (item.status === 'downloading') {
        const startedAt = this.downloadingTimestamps.get(index)
        if (startedAt && now - startedAt > settings.timeoutMs + 5_000) {
          this.downloadingTimestamps.delete(index)
          firstPendingIndex = Math.min(firstPendingIndex, index)
          hasPending = true
          return { ...item, status: '' as const }
        }
      }
      return item
    })

    if (!hasPending) return

    s.setFinishList(newFinishList)

    if (ds.downloadIndex >= endSegment || forceRestart) {
      this.isRetrying = true
      s.setDownloadState({ downloadIndex: firstPendingIndex })
      void this.downloadTS(
        s.tsUrlList,
        newFinishList,
        startSegment,
        endSegment,
        isGetMP4,
      ).finally(() => {
        this.isRetrying = false
      })
    }
  }

  resetState(): void {
    const s = this.store.getState()
    if (s.downloadState.isDownloading) return
    s.resetAll()
    this.mediaFileList = []
    this.isStreamMode = false
    this.downloadingTimestamps.clear()
  }

  onStreamSaverReady(): void {
    const streamSaver = (window as any).streamSaver
    if (streamSaver && !streamSaver.useBlobFallback) {
      streamSaver.middleTransporterUrl = `${window.location.origin}/static/mitm.html`
      this.store.getState().setIsStreamSupported(true)
    }
  }

  destroy(): void {
    const s = this.store.getState()
    s.aesConf.decryptor?.destroy()
    if (this.streamWriter) {
      this.streamWriter.abort?.().catch(() => {})
      this.streamWriter = null
    }
  }

  // ============================================================
  // Internal
  // ============================================================

  private checkCompletion() {
    const s = this.store.getState()
    const ds = s.downloadState
    if (!ds.isDownloading) return

    const finishNum = s.finishList.filter((i) => i.status === 'finish').length
    const targetSegment = this.getTargetSegment()

    if (this.streamWriter) {
      // Stream mode: flush remaining sequential segments
      let idx = ds.streamDownloadIndex
      for (; idx < this.mediaFileList.length; idx++) {
        if (this.mediaFileList[idx]) {
          this.streamWriter.write(new Uint8Array(this.mediaFileList[idx]))
          this.mediaFileList[idx] = null as any
        } else {
          break
        }
      }
      s.setDownloadState({ streamDownloadIndex: idx })

      if (idx >= targetSegment) {
        s.setDownloadState({ isDownloading: false })
        this.streamWriter.close()
        this.streamWriter = null
        s.setHasStreamWriter(false)
        this.notify.success(`streamComplete:${finishNum}`)
      }
    } else if (!this.isStreamMode && finishNum === targetSegment) {
      s.setDownloadState({ isDownloading: false })
      const completeMediaList = this.mediaFileList.filter(Boolean)
      triggerBrowserDownload(
        completeMediaList,
        s.customFileName ||
          s.title ||
          format(this.beginTime, 'yyyyMMdd_HHmmss'),
        ds.isGetMP4,
      )
      this.notify.success(`downloadComplete:${finishNum}`)
    }
  }

  private getTargetSegment(): number {
    const s = this.store.getState()
    const start = Math.max(parseInt(s.rangeDownload.startSegment) || 1, 1)
    const end = Math.max(
      parseInt(s.rangeDownload.endSegment) || s.tsUrlList.length,
      1,
    )
    const validStart = Math.min(start, s.tsUrlList.length)
    const validEnd = Math.min(end, s.tsUrlList.length)
    return Math.max(validStart, validEnd) - Math.min(validStart, validEnd) + 1
  }

  private aesDecrypt(data: ArrayBuffer, index: number): ArrayBuffer {
    const conf = this.store.getState().aesConf
    const iv =
      conf.iv ||
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index])
    const ivBuffer = iv instanceof Uint8Array ? iv.buffer : iv
    return conf.decryptor!.decrypt(data, 0, ivBuffer as ArrayBuffer, true)
  }

  private async conversionMp4(
    data: ArrayBuffer,
    index: number,
    startSegment: number,
    isGetMP4: boolean,
  ): Promise<ArrayBuffer> {
    if (!isGetMP4) return data

    try {
      // @ts-expect-error dynamic import
      const muxjs = await import('mux.js')
      return await new Promise<ArrayBuffer>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MP4 transmux timeout'))
        }, 10_000)

        const transmuxer = new muxjs.default.mp4.Transmuxer({
          keepOriginalTimestamps: true,
          duration: parseInt(String(this.durationSecond)),
        })

        transmuxer.on('data', (segment: any) => {
          clearTimeout(timeout)
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

        transmuxer.on('done', () => {
          clearTimeout(timeout)
          // If data event never fired, resolve with raw data as fallback
          resolve(data)
        })

        transmuxer.push(new Uint8Array(data))
        transmuxer.flush()
      })
    } catch (error) {
      logger.error('MP4 conversion failed:', error)
      this.notify.error('mp4Failed')
      return data
    }
  }

  private async dealTS(
    file: ArrayBuffer,
    index: number,
    startSegment: number,
    isGetMP4: boolean,
  ) {
    const s = this.store.getState()
    const data = s.aesConf.uri ? this.aesDecrypt(file, index) : file
    const afterData = await this.conversionMp4(
      data,
      index,
      startSegment,
      isGetMP4,
    )

    const mediaListIndex = index - startSegment + 1
    this.mediaFileList[mediaListIndex] = afterData
    s.setHasMediaData(true)

    // Update finish status
    s.updateFinishItem(index, 'finish')

    // Stream mode: write sequential segments immediately as they arrive
    if (this.streamWriter) {
      const ds = this.store.getState().downloadState
      let currentStreamIndex = ds.streamDownloadIndex

      for (
        let idx = currentStreamIndex;
        idx < this.mediaFileList.length;
        idx++
      ) {
        if (this.mediaFileList[idx]) {
          this.streamWriter.write(new Uint8Array(this.mediaFileList[idx]))
          this.mediaFileList[idx] = null as any
          currentStreamIndex = idx + 1
        } else {
          break
        }
      }

      s.setDownloadState({ streamDownloadIndex: currentStreamIndex })
    }
    // Completion detection is handled by checkCompletion() after worker pool drains
  }

  private async downloadTS(
    urlList: string[],
    finishItems: FinishItem[],
    startSegment: number,
    endSegment: number,
    isGetMP4: boolean,
  ) {
    const s = this.store.getState()
    let currentIndex = s.downloadState.downloadIndex

    const next = (): number | null => {
      if (currentIndex >= endSegment) return null
      const idx = currentIndex++
      this.store.getState().setDownloadState({ downloadIndex: currentIndex })
      return idx
    }

    const worker = async () => {
      while (true) {
        const ds = this.store.getState().downloadState
        if (ds.isPaused || !ds.isDownloading) return

        const index = next()
        if (index === null) return
        if (finishItems[index]?.status !== '') continue

        this.store.getState().updateFinishItem(index, 'downloading')
        this.downloadingTimestamps.set(index, Date.now())

        let success = false
        const { maxRetries, retryBaseDelayMs, timeoutMs } = this.getSettings()
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const currentDs = this.store.getState().downloadState
          if (currentDs.isPaused || !currentDs.isDownloading) return

          try {
            const file = await fetchData(
              urlList[index],
              'file',
              this.abortController?.signal,
              timeoutMs,
            )
            this.downloadingTimestamps.delete(index)
            if (!this.store.getState().downloadState.isDownloading) return
            await this.dealTS(file, index, startSegment, isGetMP4)
            success = true
            break
          } catch {
            if (!this.store.getState().downloadState.isDownloading) return
            if (attempt < maxRetries - 1) {
              const delay = retryBaseDelayMs * Math.pow(2, attempt)
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }

        if (!success) {
          this.downloadingTimestamps.delete(index)
          if (!this.store.getState().downloadState.isDownloading) return
          this.store.getState().updateFinishItem(index, 'error')

          const errorNum = this.store
            .getState()
            .finishList.filter((i) => i.status === 'error').length
          if (errorNum % 5 === 0 && errorNum > 0) {
            this.notify.warning(`retryWarning:${errorNum}`)
          }
        }
      }
    }

    const pendingCount = finishItems.filter((item) => item.status === '').length
    const targetSegment = this.getTargetSegment()
    const concurrency = Math.min(
      this.getSettings().concurrency,
      pendingCount || targetSegment,
    )
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  }

  private async getAES(
    currentAesConf: AesConf,
    urlList: string[],
    finishItems: FinishItem[],
    startSegment: number,
    endSegment: number,
    isGetMP4: boolean,
  ) {
    try {
      const key = await fetchData(currentAesConf.uri, 'file')
      const decryptor = new AESDecryptor()
      decryptor.expandKey(key)

      const newAesConf: AesConf = { ...currentAesConf, key, decryptor }
      this.store.getState().setAesConf(newAesConf)

      await this.downloadTS(
        urlList,
        finishItems,
        startSegment,
        endSegment,
        isGetMP4,
      )
    } catch {
      this.notify.error('encryptedError')
      this.store.getState().setDownloadState({ isDownloading: false })
    }
  }
}

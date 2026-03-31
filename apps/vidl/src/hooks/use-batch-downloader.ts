'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  type BatchItem,
  selectCurrentDownloadingId,
  selectDoneCount,
  selectErrorCount,
  selectParsedCount,
  selectPendingCount,
  useBatchStore,
} from '@/stores/batch-store'
import { fetchData, fetchUrlMetadata } from '@/lib'

// Re-export types for consumers
export type { BatchItem, BatchFormat, BatchStatus } from '@/stores/batch-store'

interface UseBatchDownloaderOptions {
  setUrl: (url: string) => void
  setCustomFileName: (name: string) => void
  setRangeDownload: (range: { startSegment: string; endSegment: string }) => void
  parseM3U8: (url: string) => Promise<void>
  startDownload: (isGetMP4: boolean) => Promise<void>
  directDownload: () => Promise<void>
  streamDownload: (isGetMP4: boolean) => void
}

export function useBatchDownloader(options: UseBatchDownloaderOptions) {
  const {
    setUrl,
    setCustomFileName,
    setRangeDownload,
    parseM3U8,
    startDownload,
    directDownload,
    streamDownload,
  } = options

  const t = useTranslations()
  const batchAbortRef = useRef(false)

  const batchText = useBatchStore((s) => s.batchText)
  const setBatchText = useBatchStore((s) => s.setBatchText)
  const batchList = useBatchStore((s) => s.batchList)
  const isBatchParsing = useBatchStore((s) => s.isBatchParsing)
  const isBatchRunning = useBatchStore((s) => s.isBatchRunning)
  const pendingCount = useBatchStore(selectPendingCount)
  const parsedCount = useBatchStore(selectParsedCount)
  const doneCount = useBatchStore(selectDoneCount)
  const errorCount = useBatchStore(selectErrorCount)
  const currentDownloadingId = useBatchStore(selectCurrentDownloadingId)

  const { addItems, updateItem, removeItem, clearDone, setIsBatchParsing, setIsBatchRunning } =
    useBatchStore.getState()

  // ---- Parse ----
  const parseItems = useCallback(
    async (items: BatchItem[]) => {
      if (items.length === 0) return
      setIsBatchParsing(true)
      for (const item of items) {
        updateItem(item.id, { status: 'parsing' })
        try {
          const meta = await fetchUrlMetadata(item.url)
          updateItem(item.id, {
            status: 'parsed',
            meta,
            selectedVariantUrl: meta.variants[0]?.url || '',
            rangeStart: 1,
            rangeEnd: meta.segmentCount || 0,
          })
        } catch {
          updateItem(item.id, { status: 'error' })
        }
      }
      setIsBatchParsing(false)
      toast.success(t('batch.parseComplete'))
    },
    [updateItem, setIsBatchParsing, t],
  )

  const addToQueue = useCallback(() => {
    const urls = useBatchStore.getState().batchText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
    if (urls.length === 0) {
      toast.error(t('batch.emptyList'))
      return
    }
    const items = addItems(urls)
    void parseItems(items)
  }, [t, addItems, parseItems])

  const parseAll = useCallback(() => {
    const toParse = useBatchStore.getState().batchList.filter(
      (b) => b.status === 'pending' || b.status === 'error',
    )
    void parseItems(toParse)
  }, [parseItems])

  const onVariantChange = useCallback(
    async (item: BatchItem, variantUrl: string) => {
      updateItem(item.id, { selectedVariantUrl: variantUrl })
      try {
        const m3u8Str: string = await fetchData(variantUrl)
        const count = m3u8Str
          .split('\n')
          .filter((l: string) => /^[^#]/.test(l) && l.trim()).length
        updateItem(item.id, { rangeStart: 1, rangeEnd: count })
      } catch {
        /* keep existing */
      }
    },
    [updateItem],
  )

  // ---- Download ----
  const startBatchDownload = useCallback(async () => {
    const ready = useBatchStore.getState().batchList.filter((b) => b.status === 'parsed')
    if (ready.length === 0) return
    setIsBatchRunning(true)
    batchAbortRef.current = false

    for (const item of ready) {
      if (batchAbortRef.current) break

      const downloadUrl =
        item.selectedVariantUrl || item.meta?.resolvedUrl || item.url
      updateItem(item.id, { status: 'downloading' })
      setUrl(downloadUrl)
      setCustomFileName(item.customName.trim())
      if (item.rangeEnd > 0) {
        setRangeDownload({
          startSegment: String(item.rangeStart),
          endSegment: String(item.rangeEnd),
        })
      }

      try {
        await parseM3U8(downloadUrl)
      } catch {
        updateItem(item.id, { status: 'error' })
        continue
      }
      if (batchAbortRef.current) break

      const isStream = item.format.startsWith('stream-')
      const isGetMP4 = item.format === 'mp4' || item.format === 'stream-mp4'

      try {
        if (item.meta?.isDirectVideo) {
          await directDownload()
        } else if (isStream) {
          streamDownload(isGetMP4)
        } else {
          await startDownload(isGetMP4)
        }
        updateItem(item.id, { status: 'done' })
      } catch {
        updateItem(item.id, { status: 'error' })
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    setIsBatchRunning(false)
    if (!batchAbortRef.current) toast.success(t('batch.complete'))
  }, [
    updateItem, setIsBatchRunning, setUrl, setCustomFileName, setRangeDownload,
    parseM3U8, startDownload, directDownload, streamDownload, t,
  ])

  const cancelBatch = useCallback(() => {
    batchAbortRef.current = true
    setIsBatchRunning(false)
  }, [setIsBatchRunning])

  return {
    batchText,
    setBatchText,
    batchList,
    isBatchParsing,
    isBatchRunning,
    pendingCount,
    parsedCount,
    doneCount,
    errorCount,
    currentDownloadingId,
    updateItem,
    addToQueue,
    removeBatchItem: removeItem,
    clearDone,
    parseAll,
    onVariantChange,
    startBatchDownload,
    cancelBatch,
  }
}

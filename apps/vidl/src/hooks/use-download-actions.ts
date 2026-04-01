'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useEffectEvent, useRef } from 'react'
import { toast } from 'sonner'
import type { VariantStream } from '@/lib'
import type { EngineNotifier } from '@/lib/download-engine'
import { DownloadEngine } from '@/lib/download-engine'
import { useDownloadStore } from '@/stores/download-store'
import { useSettingsStore } from '@/stores/settings-store'

function useNotifier(): EngineNotifier {
  const t = useTranslations()

  return {
    success: (msg: string) => {
      if (msg.startsWith('directVideoDetected:')) {
        const fmt = msg.split(':')[1]
        toast.success(t('parse.directVideoDetected', { format: fmt }))
      } else if (msg.startsWith('success:')) {
        const count = Number(msg.split(':')[1])
        toast.success(t('parse.success', { count }))
      } else if (msg.startsWith('streamComplete:')) {
        const count = Number(msg.split(':')[1])
        toast.success(t('download.streamComplete', { count }))
      } else if (msg.startsWith('downloadComplete:')) {
        const count = Number(msg.split(':')[1])
        toast.success(t('download.downloadComplete', { count }))
      } else {
        const key = `download.${msg}`
        toast.success(t(key))
      }
    },
    error: (msg: string) => {
      // Messages that are raw error strings (from network etc)
      if (msg.includes(' ') || msg.includes(':')) {
        toast.error(msg)
        return
      }
      // Try parse.* first, then download.*
      const parseKey = `parse.${msg}`
      const downloadKey = `download.${msg}`
      try {
        toast.error(t(parseKey))
      } catch {
        toast.error(t(downloadKey))
      }
    },
    warning: (msg: string) => {
      if (msg.startsWith('retryWarning:')) {
        const count = Number(msg.split(':')[1])
        toast.warning(t('download.retryWarning', { count }))
      } else {
        toast.warning(t(`download.${msg}`))
      }
    },
    info: (msg: string) => {
      if (msg.startsWith('variantsDetected:')) {
        const count = Number(msg.split(':')[1])
        toast.info(t('parse.variantsDetected', { count }))
      } else if (msg === 'continueSelect') {
        toast.info(t('parse.continueSelect'))
      } else {
        toast.info(t(`download.${msg}`))
      }
    },
  }
}

export function useDownloadActions() {
  const notify = useNotifier()
  const notifyRef = useRef(notify)
  notifyRef.current = notify

  const engineRef = useRef<DownloadEngine | null>(null)

  if (!engineRef.current) {
    // Stable proxy that always delegates to the latest notifier
    const stableNotify: EngineNotifier = {
      success: (m) => notifyRef.current.success(m),
      error: (m) => notifyRef.current.error(m),
      warning: (m) => notifyRef.current.warning(m),
      info: (m) => notifyRef.current.info(m),
    }
    engineRef.current = new DownloadEngine(
      useDownloadStore,
      () => useSettingsStore.getState(),
      stableNotify,
    )
  }

  const engine = engineRef.current

  // Retry tick
  const onRetryTick = useEffectEvent(() => {
    engine.retryAll(false)
  })

  // Mount: auto-parse URL param + retry interval
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url') || params.get('source')
    if (paramUrl && paramUrl.toLowerCase().includes('m3u8')) {
      useDownloadStore.getState().setUrl(paramUrl)
      void engine.parseM3U8(paramUrl)
    }

    const interval = setInterval(onRetryTick, 2000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => engine.destroy()
  }, [engine])

  return {
    parseM3U8: (url?: string) =>
      engine.parseM3U8(url || useDownloadStore.getState().url),
    selectVariant: (variant: VariantStream) => engine.selectVariant(variant),
    startDownload: (isGetMP4: boolean) => engine.startDownload(isGetMP4),
    directDownload: () => engine.directDownload(),
    streamDownload: (isGetMP4: boolean) => engine.streamDownload(isGetMP4),
    cancelDownload: () => engine.cancelDownload(),
    togglePause: () => engine.togglePause(),
    retry: (index: number) => engine.retry(index),
    forceDownload: () => engine.forceDownload(),
    resetState: () => engine.resetState(),
    onStreamSaverReady: () => engine.onStreamSaverReady(),
  }
}

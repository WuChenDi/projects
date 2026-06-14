'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { ListPlus, Lock, Radio, Video, Zap } from 'lucide-react'
import Script from 'next/script'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import {
  BatchInputCard,
  BatchQueueCard,
  ProgressCard,
  SettingsDialog,
  SourceCard,
} from '@/components/downloader'
import { useBatchActions } from '@/hooks/use-batch-actions'
import { useDownloadActions } from '@/hooks/use-download-actions'
import { useDownloadStore } from '@/stores/download-store'

export default function VideoDownloaderPage() {
  const t = useTranslations()
  const actions = useDownloadActions()
  const batch = useBatchActions()

  const isDownloading = useDownloadStore((s) => s.downloadState.isDownloading)
  const isStreamSupported = useDownloadStore((s) => s.isStreamSupported)

  // Fallback: if StreamSaver.js loaded before the Script onLoad could fire
  useEffect(() => {
    if (!isStreamSupported && (window as any).streamSaver) {
      actions.onStreamSaverReady()
    }
  }, [isStreamSupported, actions])

  const [activeTab, setActiveTab] = useState('single')

  const handleCancelBatch = () => {
    batch.cancelBatch()
  }

  const busy = isDownloading || batch.isBatchRunning

  return (
    <IKPageContainer scrollable={false}>
      <Script
        src="/static/StreamSaver.js"
        strategy="afterInteractive"
        onLoad={actions.onStreamSaverReady}
      />

      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5">
        {/* ── Hero band ───────────────────────────────────────────── */}
        <section className="deck-rise flex flex-col gap-4 pt-2">
          <h1 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-5xl">
            {t('tool.title')}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t('tool.description')}
          </p>

          {/* Capability call-signs */}
          <div className="flex flex-wrap gap-2">
            <Capability icon={Radio} label={t('console.caps.formats')} />
            <Capability icon={Lock} label={t('console.caps.decrypt')} />
            <Capability icon={Zap} label={t('console.caps.memory')} />
          </div>
        </section>

        {/* ── Console ─────────────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="deck-rise flex min-h-0 flex-1 flex-col gap-4"
          style={{ animationDelay: '0.08s' }}
        >
          {/* Channel toolbar */}
          <div className="flex items-center justify-between gap-3 border-y border-border/70 py-2">
            <div className="flex items-center gap-3">
              <span className="deck-label hidden sm:inline">CH</span>
              <TabsList>
                <TabsTrigger
                  value="single"
                  disabled={batch.isBatchRunning || isDownloading}
                >
                  <Video className="size-4" />
                  <span className="hidden sm:inline">
                    {t('console.channelSingle')}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="batch"
                  disabled={isDownloading && !batch.isBatchRunning}
                >
                  <ListPlus className="size-4" />
                  <span className="hidden sm:inline">
                    {t('console.channelBatch')}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
            <SettingsDialog disabled={busy} />
          </div>

          {/* Single */}
          <TabsContent value="single" className="space-y-4">
            <SourceCard actions={actions} />
            <ProgressCard actions={actions} />
          </TabsContent>

          {/* Batch */}
          <TabsContent value="batch" className="space-y-4">
            <BatchInputCard
              batchText={batch.batchText}
              onBatchTextChange={batch.setBatchText}
              disabled={batch.isBatchRunning || batch.isBatchParsing}
              onAddToQueue={batch.addToQueue}
            />
            {batch.batchList.length > 0 && (
              <BatchQueueCard batch={batch} onCancelBatch={handleCancelBatch} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </IKPageContainer>
  )
}

function Capability({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {label}
    </span>
  )
}

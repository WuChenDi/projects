'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { ListPlus, Video } from 'lucide-react'
import Script from 'next/script'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
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

  const [activeTab, setActiveTab] = useState('single')

  const handleCancelBatch = () => {
    batch.cancelBatch()
  }

  const busy = isDownloading || batch.isBatchRunning

  const cardAction = (
    <div className="flex items-center gap-2">
      <TabsList>
        <TabsTrigger
          value="single"
          disabled={batch.isBatchRunning || isDownloading}
        >
          <Video className="size-4" />
        </TabsTrigger>
        <TabsTrigger
          value="batch"
          disabled={isDownloading && !batch.isBatchRunning}
        >
          <ListPlus className="size-4" />
        </TabsTrigger>
      </TabsList>
      <SettingsDialog disabled={busy} />
    </div>
  )

  return (
    <IKPageContainer scrollable={false}>
      <Script
        src="/static/StreamSaver.js"
        strategy="afterInteractive"
        onLoad={actions.onStreamSaverReady}
      />
      <div className="w-full h-full flex flex-col gap-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-3 flex-1 min-h-0"
        >
          {/* Single */}
          <TabsContent value="single" className="space-y-4">
            <SourceCard headerAction={cardAction} actions={actions} />
            <ProgressCard actions={actions} />
          </TabsContent>

          {/* Batch */}
          <TabsContent value="batch" className="space-y-4">
            <BatchInputCard
              headerAction={cardAction}
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

'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { ListPlus, Video } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Script from 'next/script'
import { useState } from 'react'
import {
  BatchInputCard,
  BatchQueueCard,
  ProgressCard,
  SettingsDialog,
  SourceCard,
} from '@/components/downloader'
import { useBatchDownloader } from '@/hooks/use-batch-downloader'
import { useVideoDownloader } from '@/hooks/use-video-downloader'
import { DEFAULT_SETTINGS, useSettingsStore } from '@/stores/settings-store'

export default function M3u8Downloader() {
  const t = useTranslations()
  const settings = useSettingsStore()

  const downloader = useVideoDownloader(settings)
  const {
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
    mediaFileListRef,
    streamWriter,
    isDirectVideo,
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
  } = downloader

  const batch = useBatchDownloader({
    setUrl,
    setCustomFileName,
    setRangeDownload,
    parseM3U8,
    startDownload,
    directDownload,
    streamDownload,
  })

  const [activeTab, setActiveTab] = useState('single')

  const handleCancelBatch = () => {
    batch.cancelBatch()
    cancelDownload()
  }

  const busy = downloadState.isDownloading || batch.isBatchRunning

  const cardAction = (
    <div className="flex items-center gap-2">
      <TabsList>
        <TabsTrigger
          value="single"
          disabled={batch.isBatchRunning || downloadState.isDownloading}
        >
          <Video className="size-4" />
        </TabsTrigger>
        <TabsTrigger
          value="batch"
          disabled={downloadState.isDownloading && !batch.isBatchRunning}
        >
          <ListPlus className="size-4" />
        </TabsTrigger>
      </TabsList>
      <SettingsDialog
        settings={settings}
        defaultSettings={DEFAULT_SETTINGS}
        disabled={busy}
        onSettingsChange={settings.setSettings}
        onReset={settings.resetSettings}
      />
    </div>
  )

  return (
    <IKPageContainer scrollable={false}>
      <Script
        src="/static/StreamSaver.js"
        strategy="afterInteractive"
        onLoad={onStreamSaverReady}
      />
      <div className="w-full h-full flex flex-col gap-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-3 flex-1 min-h-0"
        >
          {/* Single */}
          <TabsContent value="single" className="space-y-4">
            <SourceCard
              headerAction={cardAction}
              url={url}
              onUrlChange={setUrl}
              customFileName={customFileName}
              onCustomFileNameChange={setCustomFileName}
              isParsing={isParsing}
              isLoadingVariant={isLoadingVariant}
              downloadState={downloadState}
              variants={variants}
              tsUrlList={tsUrlList}
              isParsed={isParsed}
              isDirectVideo={isDirectVideo}
              rangeDownload={rangeDownload}
              estimatedSize={estimatedSize}
              isStreamSupported={isStreamSupported}
              onSetRangeDownload={setRangeDownload}
              onParse={() => void parseM3U8()}
              onSelectVariant={selectVariant}
              onStartDownload={(isGetMP4) => void startDownload(isGetMP4)}
              onDirectDownload={() => void directDownload()}
              onStreamDownload={streamDownload}
              onTogglePause={togglePause}
              onCancel={cancelDownload}
            />
            <ProgressCard
              finishList={finishList}
              finishNum={finishNum}
              errorNum={errorNum}
              targetSegment={targetSegment}
              hasMediaData={mediaFileListRef.current.some(Boolean)}
              hasStreamWriter={!!streamWriter.current}
              onRetry={retry}
              onForceDownload={forceDownload}
            />
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
              <BatchQueueCard
                batchList={batch.batchList}
                isBatchParsing={batch.isBatchParsing}
                isBatchRunning={batch.isBatchRunning}
                isStreamSupported={isStreamSupported}
                pendingCount={batch.pendingCount}
                parsedCount={batch.parsedCount}
                doneCount={batch.doneCount}
                errorCount={batch.errorCount}
                currentDownloadingId={batch.currentDownloadingId}
                finishNum={finishNum}
                targetSegment={targetSegment}
                onParseAll={batch.parseAll}
                onStartBatchDownload={() => void batch.startBatchDownload()}
                onCancelBatch={handleCancelBatch}
                onClearDone={batch.clearDone}
                onRemoveItem={batch.removeBatchItem}
                onUpdateItem={batch.updateItem}
                onVariantChange={batch.onVariantChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </IKPageContainer>
  )
}

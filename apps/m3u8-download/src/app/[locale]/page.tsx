'use client'

import { IKPageContainer } from '@cdlab996/ui/IK'
import Script from 'next/script'
import { ProgressCard, SourceCard } from '@/components/downloader'
import { useM3u8Downloader } from '@/hooks/use-m3u8-downloader'

export default function M3u8Downloader() {
  const {
    url,
    setUrl,
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
    parseM3U8,
    selectVariant,
    startDownload,
    cancelDownload,
    togglePause,
    retry,
    forceDownload,
    streamDownload,
    onStreamSaverReady,
  } = useM3u8Downloader()

  return (
    <IKPageContainer scrollable={false}>
      <Script
        src="/static/StreamSaver.js"
        strategy="afterInteractive"
        onLoad={onStreamSaverReady}
      />
      <div className="w-full h-full flex flex-col gap-4">
        <SourceCard
          url={url}
          onUrlChange={setUrl}
          isParsing={isParsing}
          isLoadingVariant={isLoadingVariant}
          downloadState={downloadState}
          variants={variants}
          tsUrlList={tsUrlList}
          isParsed={isParsed}
          rangeDownload={rangeDownload}
          estimatedSize={estimatedSize}
          isStreamSupported={isStreamSupported}
          onSetRangeDownload={setRangeDownload}
          onParse={() => void parseM3U8()}
          onSelectVariant={selectVariant}
          onStartDownload={(isGetMP4) => void startDownload(isGetMP4)}
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
      </div>
    </IKPageContainer>
  )
}

'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Progress } from '@cdlab996/ui/components/progress'
import { HardDriveDownload, Loader2, Search, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BatchItem } from '@/hooks/use-batch-downloader'
import { BatchItemRow } from './batch-item-row'

interface BatchQueueCardProps {
  batchList: BatchItem[]
  isBatchParsing: boolean
  isBatchRunning: boolean
  isStreamSupported: boolean
  pendingCount: number
  parsedCount: number
  doneCount: number
  errorCount: number
  currentDownloadingId: number | null
  finishNum: number
  targetSegment: number
  onParseAll: () => void
  onStartBatchDownload: () => void
  onCancelBatch: () => void
  onClearDone: () => void
  onRemoveItem: (id: number) => void
  onUpdateItem: (id: number, patch: Partial<BatchItem>) => void
  onVariantChange: (item: BatchItem, variantUrl: string) => void
}

export function BatchQueueCard({
  batchList,
  isBatchParsing,
  isBatchRunning,
  isStreamSupported,
  pendingCount,
  parsedCount,
  doneCount,
  errorCount,
  currentDownloadingId,
  finishNum,
  targetSegment,
  onParseAll,
  onStartBatchDownload,
  onCancelBatch,
  onClearDone,
  onRemoveItem,
  onUpdateItem,
  onVariantChange,
}: BatchQueueCardProps) {
  const t = useTranslations()
  const disabled = isBatchRunning || isBatchParsing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          {t('batch.queue')} ({batchList.length})
          <div className="flex gap-1.5 ml-auto">
            {parsedCount > 0 && (
              <Badge variant="outline">
                {t('batch.parsedCount', { count: parsedCount })}
              </Badge>
            )}
            {doneCount > 0 && (
              <Badge className="bg-emerald-600">
                {t('batch.doneCount', { count: doneCount })}
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive">
                {t('batch.errorCount', { count: errorCount })}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {/* Overall batch progress */}
      {(isBatchRunning || doneCount > 0) && (
        <div className="px-6 pb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t('progress.batchOverall')}</span>
            <span className="tabular-nums">
              {doneCount} / {batchList.length}
            </span>
          </div>
          <Progress
            value={(doneCount / batchList.length) * 100}
            className="h-2"
          />
        </div>
      )}

      <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {batchList.map((item, idx) => (
              <BatchItemRow
                key={item.id}
                item={item}
                index={idx}
                disabled={disabled}
                isStreamSupported={isStreamSupported}
                isCurrentlyDownloading={item.id === currentDownloadingId}
                finishNum={finishNum}
                targetSegment={targetSegment}
                onRemove={onRemoveItem}
                onUpdate={onUpdateItem}
                onVariantChange={onVariantChange}
              />
            ))}
          </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        {!isBatchRunning ? (
          <>
            {pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onParseAll}
                disabled={isBatchParsing}
              >
                {isBatchParsing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {t('batch.parseAll')} ({pendingCount})
              </Button>
            )}
            {parsedCount > 0 && (
              <Button size="sm" onClick={onStartBatchDownload}>
                <HardDriveDownload className="size-4" />
                {t('batch.startAll')} ({parsedCount})
              </Button>
            )}
            {doneCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearDone}>
                <Trash2 className="size-4" />
                {t('batch.clearDone')}
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">
              {t('batch.running', {
                current:
                  batchList.findIndex(
                    (b) =>
                      b.status === 'parsing' || b.status === 'downloading',
                  ) + 1,
                total: batchList.length,
              })}
            </span>
            <Button size="sm" variant="destructive" onClick={onCancelBatch}>
              {t('batch.cancel')}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

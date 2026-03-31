'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Field, FieldTitle } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Progress } from '@cdlab996/ui/components/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { Slider } from '@cdlab996/ui/components/slider'
import { formatBytes } from '@cdlab996/utils'
import { Check, Loader2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BatchFormat, BatchItem, BatchStatus } from '@/hooks/use-batch-downloader'
import type { VariantStream } from '@/lib'

interface BatchItemRowProps {
  item: BatchItem
  index: number
  disabled: boolean
  isStreamSupported: boolean
  isCurrentlyDownloading: boolean
  finishNum: number
  targetSegment: number
  onRemove: (id: number) => void
  onUpdate: (id: number, patch: Partial<BatchItem>) => void
  onVariantChange: (item: BatchItem, variantUrl: string) => void
}

export function BatchItemRow({
  item,
  index,
  disabled,
  isStreamSupported,
  isCurrentlyDownloading,
  finishNum,
  targetSegment,
  onRemove,
  onUpdate,
  onVariantChange,
}: BatchItemRowProps) {
  const t = useTranslations()
  const isParsed = item.status === 'parsed'
  const hasVariants = (item.meta?.variants?.length ?? 0) > 0
  const segCount = item.meta?.segmentCount ?? 0

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm py-2 px-3 bg-muted/30">
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 text-right">
          {index + 1}
        </span>
        <StatusIndicator status={item.status} />
        <span className="truncate flex-1 font-mono text-xs">{item.url}</span>
        {isParsed && segCount > 0 && (
          <Badge variant="outline" className="text-[10px] shrink-0 h-5">
            {segCount} seg
          </Badge>
        )}
        {item.meta?.isDirectVideo && (
          <Badge variant="outline" className="text-[10px] shrink-0 h-5">
            {item.meta.directExt.toUpperCase()}
            {item.meta.estimatedSize
              ? ` · ${formatBytes({ bytes: item.meta.estimatedSize })}`
              : ''}
          </Badge>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Inline progress for downloading item */}
      {isCurrentlyDownloading && targetSegment > 0 && (
        <div className="px-3 py-2 bg-blue-500/5 border-t">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t('progress.overall')}</span>
            <span className="tabular-nums">
              {finishNum} / {targetSegment} (
              {((finishNum / targetSegment) * 100).toFixed(0)}%)
            </span>
          </div>
          <Progress
            value={(finishNum / targetSegment) * 100}
            className="h-1.5"
          />
        </div>
      )}

      {/* Done indicator */}
      {item.status === 'done' && (
        <div className="px-3 py-1.5 bg-emerald-500/5 border-t flex items-center gap-1.5">
          <Check className="size-3 text-emerald-500" />
          <span className="text-xs text-emerald-600">
            {t('batch.status.done')}
          </span>
        </div>
      )}

      {/* Error indicator */}
      {item.status === 'error' && (
        <div className="px-3 py-1.5 bg-red-500/5 border-t">
          <span className="text-xs text-red-500">
            {t('batch.status.error')}
          </span>
        </div>
      )}

      {/* Config — always visible when parsed and not running */}
      {isParsed && !disabled && (
        <div className="border-t px-3 py-3 space-y-3 bg-background/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hasVariants && (
              <Field>
                <FieldTitle className="text-xs">
                  {t('batch.variant')}
                </FieldTitle>
                <Select
                  value={item.selectedVariantUrl}
                  onValueChange={(v) => void onVariantChange(item, v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {item.meta!.variants.map((v: VariantStream) => (
                      <SelectItem key={v.url} value={v.url}>
                        {v.name}
                        {v.resolution && ` (${v.resolution})`}
                        {v.bandwidth > 0 &&
                          ` · ${(v.bandwidth / 1_000_000).toFixed(1)}Mbps`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldTitle className="text-xs">{t('batch.format')}</FieldTitle>
              <Select
                value={item.format}
                onValueChange={(v) =>
                  onUpdate(item.id, { format: v as BatchFormat })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">
                    {t('download.convertMp4')}
                  </SelectItem>
                  <SelectItem value="ts">
                    {t('download.originalFormat')}
                  </SelectItem>
                  {isStreamSupported && (
                    <>
                      <SelectItem value="stream-mp4">
                        {t('batch.streamMp4')}
                      </SelectItem>
                      <SelectItem value="stream-ts">
                        {t('batch.streamTs')}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldTitle className="text-xs">{t('filename.label')}</FieldTitle>
              <Input
                value={item.customName}
                onChange={(e) =>
                  onUpdate(item.id, { customName: e.target.value })
                }
                placeholder={t('filename.placeholder')}
                className="h-7 text-xs"
              />
            </Field>
          </div>

          {segCount > 1 && (
            <Field>
              <div className="flex items-center justify-between">
                <FieldTitle className="text-xs">{t('batch.range')}</FieldTitle>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.rangeStart} ~ {item.rangeEnd}
                </span>
              </div>
              <Slider
                value={[item.rangeStart, item.rangeEnd]}
                onValueChange={([s, e]) =>
                  onUpdate(item.id, { rangeStart: s, rangeEnd: e })
                }
                min={1}
                max={segCount}
                step={1}
              />
            </Field>
          )}
        </div>
      )}
    </div>
  )
}

function StatusIndicator({ status }: { status: BatchStatus }) {
  if (status === 'done')
    return <Check className="size-3.5 text-emerald-500 shrink-0" />
  if (status === 'downloading' || status === 'parsing')
    return <Loader2 className="size-3.5 text-blue-500 animate-spin shrink-0" />
  if (status === 'error')
    return <X className="size-3.5 text-red-500 shrink-0" />
  if (status === 'parsed')
    return <span className="size-2 rounded-full bg-sky-400 shrink-0" />
  return (
    <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
  )
}

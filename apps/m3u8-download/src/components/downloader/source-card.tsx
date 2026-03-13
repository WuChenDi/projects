'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ButtonGroup } from '@cdlab996/ui/components/button-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field, FieldTitle } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Slider } from '@cdlab996/ui/components/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { formatFileSize } from '@cdlab996/utils'
import {
  CircleQuestionMark,
  HardDriveDownload,
  Loader2,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type {
  DownloadState,
  RangeDownload,
  VariantStream,
} from '@/hooks/use-m3u8-downloader'

interface SourceCardProps {
  url: string
  onUrlChange: (url: string) => void
  isParsing: boolean
  isLoadingVariant: boolean
  downloadState: DownloadState
  variants: VariantStream[]
  tsUrlList: string[]
  isParsed: boolean
  rangeDownload: RangeDownload
  estimatedSize: number | null
  isStreamSupported: boolean
  onSetRangeDownload: (range: RangeDownload) => void
  onParse: () => void
  onSelectVariant: (variant: VariantStream) => void
  onStartDownload: (isGetMP4: boolean) => void
  onStreamDownload: (isGetMP4: boolean) => void
  onTogglePause: () => void
  onCancel: () => void
}

export function SourceCard({
  url,
  onUrlChange,
  isParsing,
  isLoadingVariant,
  downloadState,
  variants,
  tsUrlList,
  isParsed,
  rangeDownload,
  estimatedSize,
  isStreamSupported,
  onSetRangeDownload,
  onParse,
  onSelectVariant,
  onStartDownload,
  onStreamDownload,
  onTogglePause,
  onCancel,
}: SourceCardProps) {
  const t = useTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tool.title')}</CardTitle>
        <CardDescription>{t('tool.description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Field>
          <FieldTitle>{t('parse.urlLabel')}</FieldTitle>
          <div className="flex gap-2">
            <Input
              id="m3u8-url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onParse()
              }}
              disabled={downloadState.isDownloading}
              placeholder={t('parse.placeholder')}
              className="text-base"
            />
            <Button
              onClick={onParse}
              disabled={
                isParsing || downloadState.isDownloading || !url.trim()
              }
            >
              {isParsing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('parse.parsing')}
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  {t('parse.parse')}
                </>
              )}
            </Button>
          </div>
        </Field>

        {variants.length > 0 && (
          <Field>
            <FieldTitle>{t('parse.selectVariant')}</FieldTitle>
            <div className="flex gap-2 flex-wrap">
              {variants.map((v) => (
                <Button
                  key={v.url}
                  variant={v.selected ? 'default' : 'outline'}
                  size="sm"
                  disabled={isLoadingVariant || downloadState.isDownloading}
                  onClick={() => onSelectVariant(v)}
                >
                  {v.name}
                  {v.resolution && ` (${v.resolution})`}
                  {v.bandwidth > 0 &&
                    ` · ${(v.bandwidth / 1_000_000).toFixed(1)}Mbps`}
                </Button>
              ))}
            </div>
          </Field>
        )}

        {isParsed && (
          <Field>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <FieldTitle>
                {t('download.range')}
                {tsUrlList.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {t('download.totalSegments', {
                      count: tsUrlList.length,
                      size:
                        estimatedSize !== null
                          ? t('download.estimatedSize', {
                              size: formatFileSize(estimatedSize),
                            })
                          : '',
                    })}
                  </span>
                )}
              </FieldTitle>
              <span className="text-sm text-muted-foreground shrink-0">
                <span className="font-medium tabular-nums">
                  {rangeDownload.startSegment}
                </span>
                {' ~ '}
                <span className="font-medium tabular-nums">
                  {rangeDownload.endSegment}
                </span>
              </span>
            </div>
            <Slider
              value={[
                parseInt(rangeDownload.startSegment) || 1,
                parseInt(rangeDownload.endSegment) || tsUrlList.length,
              ]}
              onValueChange={(value) =>
                onSetRangeDownload({
                  startSegment: String(value[0]),
                  endSegment: String(value[1]),
                })
              }
              min={1}
              max={tsUrlList.length}
              step={1}
              disabled={downloadState.isDownloading}
              className="mt-2"
              aria-label={t('download.range')}
            />
          </Field>
        )}
      </CardContent>

      {isParsed && (
        <CardFooter className="flex-col sm:flex-row gap-4 items-start">
          {!downloadState.isDownloading ? (
            <>
              <Field>
                <FieldTitle>{t('download.normalDownload')}</FieldTitle>
                <ButtonGroup>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartDownload(false)}
                  >
                    <HardDriveDownload className="size-4" />
                    {t('download.originalFormat')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartDownload(true)}
                  >
                    <HardDriveDownload className="size-4" />
                    {t('download.convertMp4')}
                  </Button>
                </ButtonGroup>
              </Field>

              {isStreamSupported && (
                <Field>
                  <FieldTitle>
                    {t('download.streamDownload')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CircleQuestionMark className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {t('download.streamTooltip')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FieldTitle>
                  <ButtonGroup>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStreamDownload(false)}
                    >
                      <HardDriveDownload className="size-4" />
                      {t('download.originalFormat')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStreamDownload(true)}
                    >
                      <HardDriveDownload className="size-4" />
                      {t('download.convertMp4')}
                    </Button>
                  </ButtonGroup>
                </Field>
              )}
            </>
          ) : (
            <ButtonGroup>
              <Button
                onClick={onTogglePause}
                variant={downloadState.isPaused ? 'default' : 'secondary'}
              >
                {downloadState.isPaused ? (
                  <>
                    <Play className="size-4" />
                    {t('download.resume')}
                  </>
                ) : (
                  <>
                    <Pause className="size-4" />
                    {t('download.pause')}
                  </>
                )}
              </Button>
              <Button variant="destructive" onClick={onCancel}>
                <X className="size-4" />
                {t('download.cancel')}
              </Button>
            </ButtonGroup>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

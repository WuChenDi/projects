'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ButtonGroup } from '@cdlab996/ui/components/button-group'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldTitle,
} from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Slider } from '@cdlab996/ui/components/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { formatBytes } from '@cdlab996/utils'
import {
  CircleQuestionMark,
  HardDriveDownload,
  Loader2,
  Pause,
  Play,
  Search,
  TvMinimalPlay,
  X,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

const BYPLAY_URL = 'https://byplay.pages.dev'

import type {
  DownloadState,
  RangeDownload,
  VariantStream,
} from '@/hooks/use-video-downloader'

interface SourceCardProps {
  headerAction?: React.ReactNode
  url: string
  onUrlChange: (url: string) => void
  customFileName: string
  onCustomFileNameChange: (name: string) => void
  isParsing: boolean
  isLoadingVariant: boolean
  downloadState: DownloadState
  variants: VariantStream[]
  tsUrlList: string[]
  isParsed: boolean
  isDirectVideo: boolean
  rangeDownload: RangeDownload
  estimatedSize: number | null
  isStreamSupported: boolean
  onSetRangeDownload: (range: RangeDownload) => void
  onParse: () => void
  onSelectVariant: (variant: VariantStream) => void
  onStartDownload: (isGetMP4: boolean) => void
  onDirectDownload: () => void
  onStreamDownload: (isGetMP4: boolean) => void
  onTogglePause: () => void
  onCancel: () => void
}

export function SourceCard({
  headerAction,
  url,
  onUrlChange,
  customFileName,
  onCustomFileNameChange,
  isParsing,
  isLoadingVariant,
  downloadState,
  variants,
  tsUrlList,
  isParsed,
  isDirectVideo,
  rangeDownload,
  estimatedSize,
  isStreamSupported,
  onSetRangeDownload,
  onParse,
  onSelectVariant,
  onStartDownload,
  onDirectDownload,
  onStreamDownload,
  onTogglePause,
  onCancel,
}: SourceCardProps) {
  const t = useTranslations()
  const locale = useLocale()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tool.title')}</CardTitle>
        <CardDescription>{t('tool.description')}</CardDescription>
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldTitle>{t('parse.videoUrlLabel')}</FieldTitle>
          <div className="flex gap-2">
            <Input
              id="m3u8-url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onParse()
              }}
              disabled={downloadState.isDownloading}
              placeholder={t('parse.videoPlaceholder')}
              className="text-base"
            />
            <Button
              onClick={onParse}
              disabled={isParsing || downloadState.isDownloading || !url.trim()}
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={!url.trim()}
                    asChild={!!url.trim()}
                  >
                    {url.trim() ? (
                      <a
                        href={`${BYPLAY_URL}/${locale}?url=${encodeURIComponent(url.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <TvMinimalPlay className="size-4" />
                      </a>
                    ) : (
                      <span>
                        <TvMinimalPlay className="size-4" />
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('parse.playVideo')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Field>

        {variants.length > 0 && (
          <Field>
            <FieldTitle>{t('parse.variant')}</FieldTitle>
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

        {isDirectVideo && estimatedSize !== null && (
          <Field>
            <FieldTitle>
              {t('download.fileInfo')}
              <span className="text-sm text-muted-foreground">
                {formatBytes({ bytes: estimatedSize })}
              </span>
            </FieldTitle>
          </Field>
        )}

        {(isParsed || isDirectVideo) && (
          <Field>
            <FieldTitle>{t('filename.label')}</FieldTitle>
            <Input
              value={customFileName}
              onChange={(e) => onCustomFileNameChange(e.target.value)}
              disabled={downloadState.isDownloading}
              placeholder={t('filename.placeholder')}
              className="text-base"
            />
            <FieldDescription>{t('filename.hint')}</FieldDescription>
          </Field>
        )}

        {isParsed && !isDirectVideo && (
          <Field>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <FieldTitle>
                {t('download.range')}
                {tsUrlList.length > 0 && (
                  <FieldDescription>
                    {t('download.totalSegments', {
                      count: tsUrlList.length,
                      size:
                        estimatedSize !== null
                          ? t('download.estimatedSize', {
                              size: formatBytes({ bytes: estimatedSize }),
                            })
                          : '',
                    })}
                  </FieldDescription>
                )}
              </FieldTitle>
              <FieldDescription>
                <span className="font-medium tabular-nums">
                  {rangeDownload.startSegment}
                </span>
                {' ~ '}
                <span className="font-medium tabular-nums">
                  {rangeDownload.endSegment}
                </span>
              </FieldDescription>
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

      {(isParsed || isDirectVideo) && (
        <CardFooter className="flex-col sm:flex-row gap-4 items-start">
          {!downloadState.isDownloading ? (
            isDirectVideo ? (
              <Button onClick={onDirectDownload}>
                <HardDriveDownload className="size-4" />
                {t('download.directDownload')}
              </Button>
            ) : (
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
            )
          ) : isDirectVideo ? (
            <Button variant="destructive" onClick={onCancel}>
              <X className="size-4" />
              {t('download.cancel')}
            </Button>
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

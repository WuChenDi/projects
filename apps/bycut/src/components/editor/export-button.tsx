'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Checkbox } from '@cdlab996/ui/components/checkbox'
import { Label } from '@cdlab996/ui/components/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cdlab996/ui/components/popover'
import { Progress } from '@cdlab996/ui/components/progress'
import { RadioGroup, RadioGroupItem } from '@cdlab996/ui/components/radio-group'
import { Check, Copy, Download, FolderUp, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { PropertyGroup } from '@/components/editor/panels/properties/property-item'
import { DEFAULT_EXPORT_OPTIONS } from '@/constants/export-constants'
import { useEditor } from '@/hooks/use-editor'
import { getExportFileExtension, getExportMimeType } from '@/lib/export'
import type { ExportFormat, ExportQuality, ExportResult } from '@/types/export'
import { EXPORT_FORMAT_VALUES, EXPORT_QUALITY_VALUES } from '@/types/export'

export function ExportButton() {
  const t = useTranslations()
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false)
  const editor = useEditor()

  const handleExport = () => {
    setIsExportPopoverOpen(true)
  }

  const hasProject = !!editor.project.getActive()

  return (
    <Popover open={isExportPopoverOpen} onOpenChange={setIsExportPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={!hasProject}
          onClick={() => hasProject && setIsExportPopoverOpen(true)}
        >
          <FolderUp className="size-4" />
          <span>{t('common.export')}</span>
        </Button>
      </PopoverTrigger>
      {hasProject && <ExportPopover onOpenChange={setIsExportPopoverOpen} />}
    </Popover>
  )
}

function ExportPopover({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const editor = useEditor()
  const activeProject = editor.project.getActive()
  const [format, setFormat] = useState<ExportFormat>(
    DEFAULT_EXPORT_OPTIONS.format,
  )
  const [quality, setQuality] = useState<ExportQuality>(
    DEFAULT_EXPORT_OPTIONS.quality,
  )
  const [includeAudio, setIncludeAudio] = useState<boolean>(
    DEFAULT_EXPORT_OPTIONS.includeAudio || true,
  )
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const cancelRequestedRef = useRef(false)

  const handleExport = async () => {
    if (!activeProject) return

    cancelRequestedRef.current = false
    setIsExporting(true)
    setProgress(0)
    setExportResult(null)

    const result = await editor.project.export({
      options: {
        format,
        quality,
        fps: activeProject.settings.fps,
        includeAudio,
        onProgress: ({ progress }) => setProgress(progress),
        onCancel: () => cancelRequestedRef.current,
      },
    })

    setIsExporting(false)

    if (result.cancelled) {
      setExportResult(null)
      setProgress(0)
      return
    }

    setExportResult(result)

    if (result.success && result.buffer) {
      const mimeType = getExportMimeType({ format })
      const extension = getExportFileExtension({ format })
      const blob = new Blob([result.buffer], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${activeProject.metadata.name}${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onOpenChange(false)
      setExportResult(null)
      setProgress(0)
    }
  }

  const handleCancel = () => {
    cancelRequestedRef.current = true
  }

  return (
    <PopoverContent className="bg-background mr-4 flex w-80 flex-col p-0">
      {exportResult && !exportResult.success ? (
        <ExportError
          error={exportResult.error || 'Unknown error occurred'}
          onRetry={handleExport}
        />
      ) : (
        <>
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium text-sm">
              {isExporting ? t('export.exporting') : t('export.title')}
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            {!isExporting && (
              <>
                <div className="flex flex-col">
                  <PropertyGroup
                    title={t('common.format')}
                    defaultExpanded={false}
                    hasBorderTop={false}
                  >
                    <RadioGroup
                      value={format}
                      onValueChange={(value) => {
                        if (isExportFormat(value)) {
                          setFormat(value)
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mp4" id="mp4" />
                        <Label htmlFor="mp4">{t('export.mp4Label')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="webm" id="webm" />
                        <Label htmlFor="webm">{t('export.webmLabel')}</Label>
                      </div>
                    </RadioGroup>
                  </PropertyGroup>

                  <PropertyGroup
                    title={t('export.quality')}
                    defaultExpanded={false}
                  >
                    <RadioGroup
                      value={quality}
                      onValueChange={(value) => {
                        if (isExportQuality(value)) {
                          setQuality(value)
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low">{t('export.qualityLow')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium">
                          {t('export.qualityMedium')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">{t('export.qualityHigh')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="very_high" id="very_high" />
                        <Label htmlFor="very_high">
                          {t('export.qualityVeryHigh')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </PropertyGroup>

                  <PropertyGroup
                    title={t('common.audio')}
                    defaultExpanded={false}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-audio"
                        checked={includeAudio}
                        onCheckedChange={(checked) =>
                          setIncludeAudio(!!checked)
                        }
                      />
                      <Label htmlFor="include-audio">
                        {t('export.includeAudio')}
                      </Label>
                    </div>
                  </PropertyGroup>
                </div>

                <div className="p-3 pt-0">
                  <Button onClick={handleExport} className="w-full gap-2">
                    <Download className="size-4" />
                    {t('common.export')}
                  </Button>
                </div>
              </>
            )}

            {isExporting && (
              <div className="space-y-4 p-3">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between text-center">
                    <p className="text-muted-foreground mb-2 text-sm">
                      {Math.round(progress * 100)}%
                    </p>
                  </div>
                  <Progress value={progress * 100} className="w-full" />
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-md"
                  onClick={handleCancel}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </PopoverContent>
  )
}

function isExportFormat(value: string): value is ExportFormat {
  return EXPORT_FORMAT_VALUES.some((formatValue) => formatValue === value)
}

function isExportQuality(value: string): value is ExportQuality {
  return EXPORT_QUALITY_VALUES.some((qualityValue) => qualityValue === value)
}

function ExportError({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(error)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-destructive text-sm font-medium">
          {t('export.failed')}
        </p>
        <p className="text-muted-foreground text-xs">{error}</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={handleCopy}
        >
          {copied ? <Check className="text-constructive" /> : <Copy />}
          {t('common.copy')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={onRetry}
        >
          <RotateCcw />
          {t('common.retry')}
        </Button>
      </div>
    </div>
  )
}

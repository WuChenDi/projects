import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { formatFileSize } from '@cdlab996/utils'
import {
  Clipboard,
  Download,
  Eye,
  FileText,
  Lock,
  Unlock,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@cdlab996/utils'
import { getFileIcon } from '@/lib'
import type { ProcessResult } from '@/types'
import { InputModeEnum, ModeEnum } from '@/types'
import { SCAssetFailed } from './SCAssetFailed'
import { SCAssetLoading } from './SCAssetLoading'
import { SCAssetStatusRenderer } from './SCAssetStatusRenderer'
import { SCResultDialog } from './SCResultDialog'

interface SCResultCardProps {
  result: ProcessResult
  onDownload: (result: ProcessResult) => void
  onRemove: (id: string) => void
}

function isMediaType(type?: string): 'image' | 'video' | null {
  if (!type) return null
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  return null
}

export function SCResultCard({
  result,
  onDownload,
  onRemove,
}: SCResultCardProps) {
  const isMessage = result.inputMode === InputModeEnum.MESSAGE
  const [dialogOpen, setDialogOpen] = useState(false)
  const t = useTranslations()

  const mediaType =
    result.mode === ModeEnum.DECRYPT ? isMediaType(result.fileInfo?.type) : null

  const previewUrl = useMemo(() => {
    if (!mediaType || !result.downloadUrl) return null
    return result.downloadUrl
  }, [mediaType, result.downloadUrl])

  return (
    <div
      className={cn(
        'rounded-md',
        'border border-border/60 p-3',
        'transition-shadow duration-200 hover:ring-2 hover:ring-primary',
      )}
    >
      <SCAssetStatusRenderer
        status={result.status}
        renderLoading={() => <SCAssetLoading />}
        renderFailure={() => <SCAssetFailed error={result.error} />}
        renderSuccess={() => (
          <>
            <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden group border border-border/60">
              <div className="flex items-center justify-center w-full h-full">
                {isMessage ? (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <FileText className="size-8 text-primary" />
                  </div>
                ) : result.fileInfo ? (
                  (() => {
                    const config = getFileIcon(
                      result.fileInfo.name,
                      result.fileInfo.type,
                    )
                    const Icon = config.icon
                    return (
                      <div
                        className={cn(
                          'p-3 rounded-lg transition-transform duration-500 group-hover:scale-110',
                          config.bgColor,
                          config.darkBgColor,
                        )}
                      >
                        <Icon className={cn('size-8', config.color)} />
                      </div>
                    )
                  })()
                ) : null}
              </div>

              <div className="absolute top-2 left-2">
                <div
                  className={cn(
                    'size-6 rounded-md flex items-center justify-center',
                    'backdrop-blur-[2px]',
                  )}
                >
                  {result.mode === ModeEnum.ENCRYPT ? (
                    <Lock className="size-4 text-primary" />
                  ) : (
                    <Unlock className="size-4 text-green-500" />
                  )}
                </div>
              </div>

              <div className="absolute top-2 right-2 z-10 flex gap-1">
                {isMessage && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-6 bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setDialogOpen(true)}
                    title={t('common.view')}
                  >
                    <Eye className="size-4 text-white" />
                  </Button>
                )}
                {isMessage && result.text && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-6 bg-black/40 backdrop-blur-[2px]"
                    onClick={() => {
                      void copyToClipboard(result.text!)
                      toast.success(t('toast.copiedToClipboard'))
                    }}
                    title={t('common.copy')}
                  >
                    <Clipboard className="size-4 text-white" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6 bg-black/40 backdrop-blur-[2px]"
                  onClick={() => onDownload(result)}
                  title={t('common.download')}
                >
                  <Download className="size-4 text-white" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6 bg-black/40 backdrop-blur-[2px]"
                  onClick={() => {
                    onRemove(result.id)
                    toast.success(t('toast.resultRemoved'))
                  }}
                  title={t('common.remove')}
                >
                  <X className="size-4 text-white" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 mt-3 text-xs text-muted-foreground">
              <p className="flex-1 truncate">
                {isMessage
                  ? t('results.messageResult')
                  : result.fileInfo?.name || t('results.unnamedFile')}
              </p>
              <p>
                {formatFileSize(
                  result.fileInfo?.size ?? result.data.byteLength,
                )}
              </p>
            </div>
          </>
        )}
      />

      {isMessage && (
        <SCResultDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          result={result}
          onDownload={onDownload}
        />
      )}
    </div>
  )
}

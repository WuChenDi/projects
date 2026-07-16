import { Button } from '@cdlab/ui/components/button'
import { CopyButton } from '@cdlab/ui/components/copy-button'
import { IKAssetFailed, IKAssetLoading, IKAssetRenderer } from '@cdlab/ui/IK'
import { cn } from '@cdlab/ui/lib/utils'
import { formatFileSize } from '@cdlab/utils'
import { Download, Eye, FileText, Lock, Unlock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { getFileIcon } from '@/lib/fileIcon'
import type { ProcessResult } from '@/types/crypto'
import { InputModeEnum, ModeEnum } from '@/types/crypto'
import { LocalResultDialog } from './LocalResultDialog'

interface LocalResultCardProps {
  result: ProcessResult
  onDownload: (result: ProcessResult) => void
  onRemove: (id: string) => void
}

export function LocalResultCard({
  result,
  onDownload,
  onRemove,
}: LocalResultCardProps) {
  const t = useTranslations('localCrypto')
  const isMessage = result.inputMode === InputModeEnum.MESSAGE
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div
      className={cn(
        'rounded-md',
        'border border-border/60 p-3',
        'transition-shadow duration-200 hover:ring-2 hover:ring-primary',
      )}
    >
      <IKAssetRenderer
        status={result.status}
        renderLoading={() => <IKAssetLoading />}
        renderFailure={() => <IKAssetFailed error={result.error} />}
        renderSuccess={() => (
          <>
            <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden group border border-border/60">
              <div className="flex items-center justify-center w-full h-full">
                {isMessage ? (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <FileText className="size-8 text-primary" />
                  </div>
                ) : result.fileInfo ? (
                  <div className="p-3 rounded-lg bg-muted transition-transform duration-500 group-hover:scale-110">
                    {getFileIcon(result.fileInfo.name, 32)}
                  </div>
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
                    size="icon-xs"
                    className="bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setDialogOpen(true)}
                    title={t('card.view')}
                  >
                    <Eye />
                  </Button>
                )}
                {isMessage && result.text && (
                  <CopyButton
                    variant="secondary"
                    size="icon-xs"
                    className="bg-black/40 backdrop-blur-[2px]"
                    value={result.text}
                    title={t('card.copy')}
                  />
                )}
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="bg-black/40 backdrop-blur-[2px]"
                  onClick={() => onDownload(result)}
                  title={t('card.download')}
                >
                  <Download />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="bg-black/40 backdrop-blur-[2px]"
                  onClick={() => {
                    onRemove(result.id)
                    toast.success(t('toast.resultRemoved'))
                  }}
                  title={t('card.remove')}
                >
                  <X />
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
        <LocalResultDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          result={result}
          onDownload={onDownload}
        />
      )}
    </div>
  )
}

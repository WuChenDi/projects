'use client'

import { Button } from '@cdlab/ui/components/button'
import { CopyButton } from '@cdlab/ui/components/copy-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Label } from '@cdlab/ui/components/label'
import { Textarea } from '@cdlab/ui/components/textarea'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ProcessResult } from '@/types/crypto'
import { ModeEnum } from '@/types/crypto'

interface LocalResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ProcessResult | null
  onDownload: (result: ProcessResult) => void
}

export function LocalResultDialog({
  open,
  onOpenChange,
  result,
  onDownload,
}: LocalResultDialogProps) {
  const t = useTranslations('localCrypto')
  const isEncrypt = result?.mode === ModeEnum.ENCRYPT

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEncrypt ? t('dialog.encryptedText') : t('dialog.decryptedText')}
          </DialogTitle>
          <DialogDescription>
            {isEncrypt
              ? t('dialog.encryptedSuccess')
              : t('dialog.decryptedSuccess')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {isEncrypt
                  ? t('dialog.encryptedContent')
                  : t('dialog.decryptedContent')}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => result && onDownload(result)}
                >
                  <Download />
                </Button>
                <CopyButton size="icon" value={result?.text || ''} />
              </div>
            </div>
            <Textarea
              value={result?.text || ''}
              readOnly
              className="font-mono text-sm min-h-[300px] max-h-[400px]"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

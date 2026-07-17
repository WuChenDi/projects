'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { StatusEnum } from '@cdlab/ui/IK'
import { Download, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { LocalResultCard } from './LocalResultCard'

interface HistoryDialogProps {
  crypto: ReturnType<typeof useCryptoProcessor>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HistoryDialog({
  crypto,
  open,
  onOpenChange,
}: HistoryDialogProps) {
  const t = useTranslations('localCrypto')
  const results = crypto.processResults
  const completed = results.filter((r) => r.status === StatusEnum.COMPLETED)

  const clearAll = () => {
    results.forEach((r) => crypto.removeResult(r.id))
    toast.success(t('toast.allCleared'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('results.history')}</DialogTitle>
          <DialogDescription>{t('results.historyDesc')}</DialogDescription>
        </DialogHeader>

        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t('results.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={completed.length === 0}
                onClick={() =>
                  completed.forEach((r) => crypto.handleDownloadResult(r))
                }
              >
                <Download />
                {t('results.downloadAll')}
              </Button>
              <Button size="sm" variant="secondary" onClick={clearAll}>
                <Trash2 />
                {t('results.clearAll')}
              </Button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-0.5 sm:grid-cols-3 md:grid-cols-4">
              {results.map((result) => (
                <LocalResultCard
                  key={result.id}
                  result={result}
                  onDownload={crypto.handleDownloadResult}
                  onRemove={crypto.removeResult}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import type { QRCodeHandle } from '@cdlab996/ui/components/qr-code'
import { QRCode } from '@cdlab996/ui/components/qr-code'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'

export function QrDialog({
  url,
  slug,
  open,
  onOpenChange,
}: {
  url: string
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('links')
  const qrRef = useRef<QRCodeHandle>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('qr.title')}</DialogTitle>
          <DialogDescription className="break-all">{url}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <QRCode ref={qrRef} value={url} type="canvas" size={224} bordered />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => qrRef.current?.download(`${slug}.png`)}
          >
            <Download className="mr-2 size-4" />
            {t('qr.download')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

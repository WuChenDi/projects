'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

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
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!open) return
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('qr.title')}</DialogTitle>
          <DialogDescription className="break-all">{url}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {dataUrl ? (
            // biome-ignore lint/performance/noImgElement: QR is a local data URL; next/image adds no value
            <img
              src={dataUrl}
              alt={`QR code for ${slug}`}
              className="size-56 rounded-md border bg-white p-2"
            />
          ) : (
            <div className="size-56 animate-pulse rounded-md border bg-muted" />
          )}
          <a href={dataUrl} download={`${slug}.png`} className="w-full">
            <Button variant="outline" className="w-full" disabled={!dataUrl}>
              <Download className="mr-2 size-4" />
              {t('qr.download')}
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}

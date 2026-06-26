'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cdlab996/ui/components/popover'
import type { QRCodeHandle } from '@cdlab996/ui/components/qr-code'
import { QRCode } from '@cdlab996/ui/components/qr-code'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { useRef } from 'react'

export function QrPopover({
  url,
  slug,
  children,
}: {
  url: string
  slug: string
  children: ReactNode
}) {
  const t = useTranslations('links')
  const qrRef = useRef<QRCodeHandle>(null)

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-56 break-all text-center text-xs text-muted-foreground">
            {url}
          </p>
          {/* Fixed black-on-white + quiet zone so the code scans regardless of
              theme and the downloaded PNG looks right. */}
          <QRCode
            ref={qrRef}
            value={url}
            type="canvas"
            size={224}
            fgColor="#0f172a"
            bgColor="#ffffff"
            marginSize={2}
            bordered
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => qrRef.current?.download(`${slug}.png`)}
          >
            <Download className="mr-2 size-4" />
            {t('qr.download')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

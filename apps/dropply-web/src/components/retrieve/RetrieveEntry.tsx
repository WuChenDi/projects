'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { Download, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { PocketChestAPI } from '@/lib'
import { InputModeEnum } from '@/types/crypto'

interface RetrieveEntryProps {
  crypto: ReturnType<typeof useCryptoProcessor>
  /** A `?code=` deep link auto-opens and prefills. */
  initialCode?: string | null
}

/**
 * Lightweight retrieve entry: enter a share code, download the finished
 * ciphertext, and drop it into the tool — which auto-detects it and switches to
 * decrypt. No separate retrieve screen.
 */
export function RetrieveEntry({ crypto, initialCode }: RetrieveEntryProps) {
  const t = useTranslations('retrieve')
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase())
      setOpen(true)
    }
  }, [initialCode])

  const retrieve = async () => {
    const c = code.trim().toUpperCase()
    if (c.length !== 6) return
    setLoading(true)
    try {
      const api = new PocketChestAPI()
      const { files, chestToken } = await api.retrieveChest(c)
      if (files.length === 0) throw new Error(t('emptyHint'))
      const f = files[0]
      const blob = await api.downloadFile(f.fileId, chestToken)
      const file = new File([blob], f.filename || `${c}.enc`, {
        type: 'application/octet-stream',
      })
      crypto.setInputMode(InputModeEnum.FILE)
      await crypto.handleFileSelect([file])
      toast.success(t('fetched'))
      setOpen(false)
      setCode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('retrievingFiles'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        aria-label={t('open')}
        title={t('open')}
        onClick={() => setOpen(true)}
      >
        <Download className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('open')}</DialogTitle>
            <DialogDescription>{t('openDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="retrieve-code">{t('retrievalCode')}</Label>
              <Input
                id="retrieve-code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && retrieve()}
                placeholder={t('retrievalCodePlaceholder')}
                className="font-mono tracking-widest"
              />
            </div>
            <Button
              className="w-full"
              disabled={loading || code.trim().length !== 6}
              onClick={retrieve}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t('accessFiles')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

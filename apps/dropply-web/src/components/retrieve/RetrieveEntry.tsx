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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'
import { PocketChestAPI } from '@/lib'
import { configQueryOptions } from '@/lib/queries'
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
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase())
      setOpen(true)
    }
  }, [initialCode])

  const retrieveMutation = useMutation({
    mutationFn: async () => {
      const c = code.trim().toUpperCase()
      const api = new PocketChestAPI()
      const { maxFileSize } =
        await queryClient.ensureQueryData(configQueryOptions)
      const { files, chestToken } = await api.retrieveChest(c)
      if (files.length === 0) throw new Error(t('emptyHint'))
      const retrieved: File[] = []
      for (const f of files) {
        const name = f.filename || `${c}.enc`
        if (f.size > maxFileSize) {
          toast.error(t('fileTooLarge', { name }))
          continue
        }
        const blob = await api.downloadFile(f.fileId, chestToken)
        retrieved.push(
          new File([blob], name, { type: 'application/octet-stream' }),
        )
      }
      if (retrieved.length === 0) return false
      crypto.setInputMode(InputModeEnum.FILE)
      await crypto.handleFileSelect(retrieved)
      return true
    },
    onSuccess: (ok) => {
      if (!ok) return
      toast.success(t('fetched'))
      setOpen(false)
      setCode('')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('retrievingFiles'))
    },
  })
  const loading = retrieveMutation.isPending

  const retrieve = () => {
    const c = code.trim().toUpperCase()
    if (c.length < 6 || c.length > 8) return
    retrieveMutation.mutate()
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
                maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && retrieve()}
                placeholder={t('retrievalCodePlaceholder')}
                className="font-mono tracking-widest"
              />
            </div>
            <Button
              className="w-full"
              disabled={
                loading || code.trim().length < 6 || code.trim().length > 8
              }
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

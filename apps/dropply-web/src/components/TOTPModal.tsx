'use client'

import { Alert, AlertDescription } from '@cdlab/ui/components/alert'
import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@cdlab/ui/components/input-otp'
import { AlertCircle, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface TOTPModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (token: string) => Promise<void>
  error?: string
  allowCancel?: boolean
}

export function TOTPModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  allowCancel = true,
}: TOTPModalProps) {
  const t = useTranslations('totp')
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (token.length !== 6) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(token)
      setToken('')
    } catch {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={allowCancel}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle>{t('title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <InputOTP
              maxLength={6}
              value={token}
              onChange={setToken}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">
              {t('checkApp')}
            </p>
          </div>

          <DialogFooter>
            {allowCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
            )}
            <Button type="submit" disabled={token.length !== 6 || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('verifying')}
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  {t('authenticate')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

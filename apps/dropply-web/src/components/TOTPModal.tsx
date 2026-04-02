'use client'

import { Alert, AlertDescription } from '@cdlab996/ui/components/alert'
import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Input } from '@cdlab996/ui/components/input'
import { AlertCircle, Loader2, Lock, ShieldCheck } from 'lucide-react'
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

  const handleTokenChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setToken(digits)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={allowCancel}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle>Authentication Required</DialogTitle>
          </div>
          <DialogDescription>
            Enter your 6-digit TOTP code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Input
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="text-center text-lg font-mono font-bold tracking-[0.3em]"
              autoComplete="one-time-code"
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Check your authenticator app</span>
              <span className={token.length === 6 ? 'text-green-600' : ''}>
                {token.length}/6
              </span>
            </div>
          </div>

          <DialogFooter>
            {allowCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={token.length !== 6 || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Authenticate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

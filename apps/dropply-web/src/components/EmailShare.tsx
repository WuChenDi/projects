'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Field } from '@cdlab/ui/components/field'
import { Input } from '@cdlab/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@cdlab/ui/components/input-group'
import { Label } from '@cdlab/ui/components/label'
import { CheckCircle, Loader2, Mail, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { PocketChestAPI } from '@/lib'
import type { EmailShareRequest } from '@/types'

interface EmailShareProps {
  retrievalCode: string
  isVisible: boolean
  onClose: () => void
}

export function EmailShare({
  retrievalCode,
  isVisible,
  onClose,
}: EmailShareProps) {
  const t = useTranslations('email')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const api = new PocketChestAPI()

  const resetForm = () => {
    setRecipientEmail('')
    setRecipientName('')
    setSenderName('')
    setMessage('')
    setSent(false)
    setError('')
  }

  const handleSend = async () => {
    if (!recipientEmail.trim()) return

    setIsSending(true)
    setError('')

    try {
      const requestData: EmailShareRequest = {
        retrievalCode,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || undefined,
        senderName: senderName.trim() || undefined,
        message: message.trim() || undefined,
      }

      const result = await api.shareViaEmail(requestData)

      if (result.sent) {
        setSent(true)
        setTimeout(() => {
          onClose()
          resetForm()
        }, 2000)
      } else {
        throw new Error(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSending) {
      onClose()
      resetForm()
    }
  }

  return (
    <Dialog open={isVisible} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <DialogTitle>{t('title')}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t('title')}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="size-12 text-emerald-500" />
            <p className="text-lg font-semibold">{t('sentTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('sentMessage')}</p>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <Field>
                <Label htmlFor="recipient-email">{t('recipientEmail')}</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t('recipientEmailPlaceholder')}
                  disabled={isSending}
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <Label htmlFor="recipient-name">{t('theirName')}</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={t('theirNamePlaceholder')}
                    disabled={isSending}
                  />
                </Field>
                <Field>
                  <Label htmlFor="sender-name">{t('yourName')}</Label>
                  <Input
                    id="sender-name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={t('yourNamePlaceholder')}
                    disabled={isSending}
                  />
                </Field>
              </div>

              <Field>
                <Label htmlFor="message">{t('personalMessage')}</Label>
                <InputGroup>
                  <InputGroupTextarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('messagePlaceholder')}
                    className=" resize-none break-all"
                    maxLength={500}
                    disabled={isSending}
                  />
                  <InputGroupAddon align="block-end" className="border-t">
                    <InputGroupText className="text-xs text-muted-foreground">
                      {t('messageHint')}
                    </InputGroupText>
                    <InputGroupText className="ml-auto text-xs text-muted-foreground">
                      {message.length}/500
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSending}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!recipientEmail.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('sending')}
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    {t('sendEmail')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

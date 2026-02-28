'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent } from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Textarea } from '@cdlab996/ui/components/textarea'
import { cn } from '@cdlab996/ui/lib/utils'
import { CheckCircle, Mail, Send, X } from 'lucide-react'
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
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>('')

  const api = new PocketChestAPI()

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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send email'
      setError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const resetForm = () => {
    setRecipientEmail('')
    setRecipientName('')
    setSenderName('')
    setMessage('')
    setSent(false)
    setError('')
  }

  const handleClose = () => {
    onClose()
    if (!isSending) {
      resetForm()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSending) {
      handleClose()
    }
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      onKeyDown={handleKeyPress}
    >
      <Card
        className="w-full max-w-md mx-auto border-none bg-card/90 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              Share via Email
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSending}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </Button>
          </div>

          {sent ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h4 className="text-lg font-semibold text-green-600 mb-2">
                Email Sent!
              </h4>
              <p className="text-muted-foreground">
                The retrieval code has been shared successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg">
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="recipient-email">Recipient Email *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="mt-1"
                  disabled={isSending}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recipient-name">Their Name</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1"
                    disabled={isSending}
                  />
                </div>
                <div>
                  <Label htmlFor="sender-name">Your Name</Label>
                  <Input
                    id="sender-name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                    disabled={isSending}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  className="mt-1 h-20 resize-none"
                  maxLength={500}
                  disabled={isSending}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    This message will be included in the email
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.length}/500
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleClose}
                  disabled={isSending}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSend}
                  disabled={!recipientEmail.trim() || isSending}
                  className={cn(
                    'flex-1 h-12 bg-gradient-to-r from-purple-500 to-blue-500',
                    'hover:from-purple-600 hover:to-blue-600 text-white border-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin mr-2">⏳</div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

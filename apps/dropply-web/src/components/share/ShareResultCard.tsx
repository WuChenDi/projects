'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card } from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import { copyToClipboard } from '@cdlab996/utils'
import { CheckCircle, Copy, Link2, Mail, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { ShareResult } from '@/store/useShareStore'

interface ShareResultCardProps {
  result: ShareResult
  emailShareEnabled?: boolean
  onRemove: (id: string) => void
  onEmailShare?: (code: string) => void
}

export function ShareResultCard({
  result,
  emailShareEnabled,
  onRemove,
  onEmailShare,
}: ShareResultCardProps) {
  const t = useTranslations('share')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(result.shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card
      className={cn(
        'relative p-4 border',
        'bg-linear-to-br from-blue-50/30 to-indigo-50/30 border-blue-200/30',
        'dark:from-blue-950/10 dark:to-indigo-950/10 dark:border-blue-800/20',
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-primary shrink-0" />
            <code className="font-mono font-bold text-primary text-lg">
              {result.retrievalCode}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
            onClick={() => onRemove(result.id)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <code className="block text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded-lg break-all leading-relaxed">
          {result.shareUrl}
        </code>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            size="sm"
            variant="outline"
            className={cn(
              'flex-1 text-xs',
              copied &&
                'text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30',
            )}
          >
            {copied ? (
              <>
                <CheckCircle className="size-4" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="size-4" />
                {t('copyLink')}
              </>
            )}
          </Button>
          {emailShareEnabled && onEmailShare && (
            <Button
              onClick={() => onEmailShare(result.retrievalCode)}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Mail className="size-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {new Date(result.timestamp).toLocaleString()}
        </p>
      </div>
    </Card>
  )
}

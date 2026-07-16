'use client'

import { Button } from '@cdlab/ui/components/button'
import { Card } from '@cdlab/ui/components/card'
import { cn } from '@cdlab/ui/lib/utils'
import { copyToClipboard } from '@cdlab/utils'
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

  // Signature: split the share URL at the `#`. The left half (?code=…) is what
  // the server sees; the `#key=…` fragment stays in the browser and is never
  // transmitted — render it detached and glowing.
  const hashIdx = result.shareUrl.indexOf('#')
  const urlBase =
    hashIdx >= 0 ? result.shareUrl.slice(0, hashIdx) : result.shareUrl
  const urlFragment = hashIdx >= 0 ? result.shareUrl.slice(hashIdx) : ''

  return (
    <Card className="relative p-4 border border-border bg-card">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-primary shrink-0" />
            <code className="font-mono font-semibold text-primary text-lg tracking-tight">
              {result.retrievalCode}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(result.id)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <code className="block text-xs font-mono bg-muted/50 p-2 rounded-lg break-all leading-relaxed">
          <span className="text-muted-foreground">{urlBase}</span>
          {urlFragment && (
            <span className="text-foreground">{urlFragment}</span>
          )}
        </code>

        {urlFragment && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            <span className="font-mono text-foreground">#key</span>{' '}
            {t('fragmentNote')}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            size="sm"
            variant="outline"
            className={cn(
              'flex-1 text-xs',
              copied && 'text-foreground border-border bg-muted',
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

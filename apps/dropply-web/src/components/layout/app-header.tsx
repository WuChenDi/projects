'use client'

import { Button } from '@cdlab/ui/components/button'
import { cn } from '@cdlab/ui/lib/utils'
import { History, KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { KeyManagerDialog } from '@/components/keys/KeyManagerDialog'
import { LanguageSelector } from '@/components/layout/language-selector'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { HistoryDialog } from '@/components/local-crypto/HistoryDialog'
import { RetrieveEntry } from '@/components/retrieve/RetrieveEntry'
import type { useCryptoProcessor } from '@/hooks/useCryptoProcessor'

interface AppHeaderProps {
  crypto: ReturnType<typeof useCryptoProcessor>
  initialCode?: string | null
  /** True once the scroll viewport has moved past the top. */
  scrolled: boolean
}

export function AppHeader({ crypto, initialCode, scrolled }: AppHeaderProps) {
  const t = useTranslations('localCrypto')
  const tk = useTranslations('keys')
  const [keyManagerOpen, setKeyManagerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const count = crypto.processResults.length

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b transition-colors duration-200',
        scrolled
          ? 'border-border bg-background/80 backdrop-blur'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Dropply
        </a>
        <div className="flex items-center gap-1.5">
          {count > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="relative"
              aria-label={t('results.history')}
              title={t('results.history')}
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground">
                {count > 99 ? '99+' : count}
              </span>
            </Button>
          )}
          <RetrieveEntry crypto={crypto} initialCode={initialCode} />
          <Button
            variant="outline"
            size="icon"
            aria-label={tk('title')}
            title={tk('title')}
            onClick={() => setKeyManagerOpen(true)}
          >
            <KeyRound className="size-4" />
          </Button>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <KeyManagerDialog
        open={keyManagerOpen}
        onOpenChange={setKeyManagerOpen}
      />
      <HistoryDialog
        crypto={crypto}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </header>
  )
}

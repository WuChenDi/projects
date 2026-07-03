'use client'

import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon } from '@cdlab996/ui/icon'
import { useTranslations } from 'next-intl'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'

const GITHUB_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/vidl'

export function SiteHeader() {
  const t = useTranslations()

  return (
    <header className="relative z-10 w-full">
      {/* top signal rail */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/30 to-transparent" />

      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
        {/* Wordmark */}
        <a href="/" className="group flex items-center gap-3">
          <span className="relative flex size-9 items-center justify-center rounded-sm border border-primary/50 bg-primary/10">
            <span className="rec-dot" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-2xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
              VIDL
            </span>
            <span className="deck-label mt-1 hidden sm:block">
              {t('console.callsign')}
            </span>
          </span>
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          {/* privacy call-sign */}
          <span className="deck-label hidden items-center gap-1.5 rounded-sm border border-border bg-card/60 px-2.5 py-1.5 lg:inline-flex">
            <span className="size-1.5 rounded-full bg-[var(--signal-go)]" />
            {t('console.privacy')}
          </span>

          <LanguageSelector />
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" aria-label="GitHub">
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
              <GitHubIcon className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

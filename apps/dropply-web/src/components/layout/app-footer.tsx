'use client'

import { Button } from '@cdlab/ui/components/button'
import { GitHubIcon } from '@cdlab/ui/icon/GitHubIcon'
import { useTranslations } from 'next-intl'

const REPO_URL =
  'https://github.com/WuChenDi/projects/tree/main/apps/dropply-web'

const linkClass =
  'h-auto gap-1.5 p-0 text-foreground/80 no-underline hover:text-foreground hover:no-underline'

export function AppFooter() {
  const t = useTranslations('landing.footer')

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs space-y-3">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Dropply
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('tagline')}
            </p>
            <p className="text-xs text-muted-foreground/80">{t('trust')}</p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-10">
            <nav className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('learn')}
              </p>
              <ul className="space-y-2">
                <li>
                  <Button asChild variant="link" className={linkClass}>
                    <a href="#how-it-works">{t('howItWorks')}</a>
                  </Button>
                </li>
              </ul>
            </nav>
            <nav className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {t('project')}
              </p>
              <ul className="space-y-2">
                <li>
                  <Button asChild variant="link" className={linkClass}>
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <GitHubIcon className="size-4" />
                      {t('github')}
                    </a>
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t('copyright')}</span>
          <span className="font-mono text-muted-foreground/70">
            {t('builtWith')}
          </span>
        </div>
      </div>
    </footer>
  )
}

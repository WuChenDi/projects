'use client'

import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon as Github } from '@cdlab996/ui/icon'
import { ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  const t = useTranslations('header')

  return (
    <header className="relative w-full z-10">
      <div className="flex h-20 px-4 md:px-6 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="https://wcd.pages.dev/logo.png"
              alt="Chendi Wu Logo"
              width={32}
              height={32}
              className="rounded-full mr-2"
            />
            {t('title')
              .split('')
              .map((letter, index) => {
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                    key={index}
                    className="hover:text-fun-pink hover:-mt-2 transition-all duration-500 hover:duration-100 click:goodbyeLetterAnim text-card-foreground"
                  >
                    {letter}
                  </span>
                )
              })}
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="https://wcd.pages.dev/projects/"
              className="transition-colors flex items-center gap-1 uppercase text-card-foreground"
            >
              {t('more')}
              <ExternalLinkIcon className="size-4" />
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button asChild variant="outline" size="icon" aria-label="GitHub">
              <a
                href="https://github.com/WuChenDi/projects/tree/main/apps/text2img"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

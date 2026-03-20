'use client'

import { Button } from '@cdlab996/ui/components/button'
import { ExternalLinkIcon, Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSelector, ThemeToggle } from '@/components/layout'

export function Header() {
  const t = useTranslations('header')

  return (
    <header className="relative w-full z-10">
      <div className="flex h-20 px-4 md:px-6 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="https://notes-wudi.pages.dev/images/logo.png"
              alt="Chendi Wu Logo"
              width={32}
              height={32}
              className="rounded-full mr-2"
            />
            {'ByPlay'.split('').map((letter, index) => {
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
            <Link
              href="https://notes-wudi.pages.dev/projects/"
              className="transition-colors flex items-center gap-1 uppercase text-card-foreground"
            >
              {t('more')}
              <ExternalLinkIcon className="size-4" />
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button asChild variant="outline" size="icon" aria-label="GitHub">
              <Link
                href="https://github.com/WuChenDi/projects/tree/main/apps/byplay"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon } from '@cdlab996/ui/icon'
import {
  ChevronLeftIcon,
  HeartIcon,
  HistoryIcon,
  SettingsIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { siteConfig } from '@/lib/config/site-config'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { ThemeToggle } from './theme-toggle'

interface HeaderProps {
  onReset?: () => void
  isPremiumMode?: boolean
  isBack?: boolean
}

export function Header({
  onReset,
  isPremiumMode = false,
  isBack = false,
}: HeaderProps) {
  const router = useRouter()
  const homeHref = isPremiumMode ? '/premium' : '/'
  const settingsHref = isPremiumMode ? '/premium/settings' : '/settings'
  const { setFavoritesOpen, setHistoryOpen } = useSidebarStore()

  return (
    <header className="relative w-full z-10">
      <div className="flex h-20 px-4 md:px-6 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={homeHref}
              onClick={onReset}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0"
            >
              <Image
                src="https://notes-wudi.pages.dev/images/logo.png"
                alt="Chendi Wu Logo"
                width={32}
                height={32}
                className="rounded-full mr-2"
              />
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">
                  {siteConfig.name}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block truncate">
                  {siteConfig.description}
                </p>
              </div>
            </Link>

            {isBack && (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => router.back()}
                  className="sm:hidden"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="hidden sm:flex"
                >
                  <ChevronLeftIcon className="size-4" />
                  返回
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              aria-label="我的收藏"
              onClick={() => setFavoritesOpen(true)}
            >
              <HeartIcon className="size-4 sm:size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="观看历史"
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryIcon className="size-4 sm:size-5" />
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="设置">
              <Link href={settingsHref}>
                <SettingsIcon className="size-4 sm:size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="GitHub">
              <Link
                href="https://github.com/WuChenDi/projects/tree/main/apps/flox"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon } from '@cdlab996/ui/icon'
import { ChevronLeftIcon, HeartIcon, HistoryIcon, SettingsIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/layout'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { siteConfig } from '@/lib/config/site-config'

export function PlayerNavbar({ isPremium }: { isPremium?: boolean }) {
  const router = useRouter()
  const homeHref = isPremium ? '/premium' : '/'
  const settingsHref = isPremium ? '/premium/settings' : '/settings'
  const { setFavoritesOpen, setHistoryOpen } = useSidebarStore()

  return (
    <header className="relative w-full z-10">
      <div className="flex h-20 px-4 md:px-6 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={homeHref}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0"
            >
              <Image
                src="/icon.png"
                alt={siteConfig.name}
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
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

            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ChevronLeftIcon className="size-4" />
              <span className="hidden sm:inline">返回</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="outline" size="icon" aria-label="我的收藏" onClick={() => setFavoritesOpen(true)}>
              <HeartIcon className="size-4 sm:size-5" />
            </Button>
            <Button variant="outline" size="icon" aria-label="观看历史" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon className="size-4 sm:size-5" />
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="设置">
              <Link href={settingsHref}>
                <SettingsIcon className="size-4 sm:size-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="GitHub">
              <Link
                href="https://github.com/WuChenDi/projects/tree/main/apps/kvideo"
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

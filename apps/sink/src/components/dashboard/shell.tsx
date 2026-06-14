'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { BarChart3, Link2, LogOut, Settings, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher, ThemeToggle } from '@/components/layout'
import { useAuthStore } from '@/stores/auth-store'

const ITEMS = [
  { href: '/dashboard', key: 'overview', icon: BarChart3, exact: true },
  { href: '/dashboard/links', key: 'links', icon: Link2, exact: false },
  {
    href: '/dashboard/analytics',
    key: 'analytics',
    icon: Sparkles,
    exact: false,
  },
  {
    href: '/dashboard/settings',
    key: 'settings',
    icon: Settings,
    exact: false,
  },
] as const

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('dashboard.nav')
  const tc = useTranslations('common')
  const signOut = useAuthStore((s) => s.signOut)

  function onSignOut() {
    signOut()
    router.replace('/dashboard/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 md:px-6">
          <div className="flex items-center gap-1 md:gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Link2 className="size-4" />
              </span>
              {tc('appName')}
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {ITEMS.map((item) => {
                const Icon = item.icon
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn('h-8', active && 'pointer-events-none')}
                    >
                      <Icon className="mr-1 size-3.5" />
                      {t(item.key)}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              aria-label={tc('signOut')}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">{tc('signOut')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {children}
      </main>
    </div>
  )
}

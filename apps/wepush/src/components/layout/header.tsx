'use client'

import { Button } from '@cdlab996/ui/components/button'
import { GitHubIcon as Github } from '@cdlab996/ui/icon'
import { cn } from '@cdlab996/ui/lib/utils'
import { Bug, FileText, Home, ListChecks, Settings, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/layout/theme-toggle'

const BRAND = 'wepush'
const GITHUB_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/wepush'

const ITEMS = [
  { href: '/dashboard', label: '概览', icon: Home, exact: true },
  { href: '/dashboard/users', label: '接收人', icon: Users },
  { href: '/dashboard/templates', label: '模板', icon: FileText },
  { href: '/dashboard/logs', label: '日志', icon: ListChecks },
  { href: '/dashboard/debug', label: '探测', icon: Bug },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
]

export function Header() {
  const pathname = usePathname()
  return (
    <header className="relative max-w-7xl mx-auto z-10">
      <div className="flex h-20 px-4 md:px-6 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear">
        <Link href="/dashboard" className="flex shrink-0 items-center">
          <Image
            src="https://wcd.pages.dev/logo.png"
            alt="Chendi Wu Logo"
            width={32}
            height={32}
            className="mr-2 rounded-full"
            unoptimized
          />
          {BRAND.split('').map((letter, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static brand string, order is stable
              key={index}
              className="transition-all duration-500 hover:-mt-2 hover:text-primary hover:duration-100"
            >
              {letter}
            </span>
          ))}
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 shrink-0',
                    active && 'pointer-events-none',
                  )}
                >
                  <Icon className="size-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" aria-label="GitHub">
            <a href={GITHUB_HREF} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export function MobileNav({
  items,
  className,
}: {
  items: NavItem[]
  className?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      root.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-label="切换菜单"
        onClick={() => setOpen((value) => !value)}
        className={cn('shrink-0', className)}
      >
        <div className="relative size-4">
          <span
            className={cn(
              'absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100',
              open ? 'top-[0.45rem] -rotate-45' : 'top-1',
            )}
          />
          <span
            className={cn(
              'absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100',
              open ? 'top-[0.45rem] rotate-45' : 'top-2.5',
            )}
          />
        </div>
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-x-0 top-20 bottom-0 z-40 bg-background animate-in fade-in-0 duration-100">
            <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 py-6">
              {items.map((item) => {
                const Icon = item.icon
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium transition-colors',
                      active
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>,
          document.body,
        )}
    </>
  )
}

export default MobileNav

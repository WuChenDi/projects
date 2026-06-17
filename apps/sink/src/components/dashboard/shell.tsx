'use client'

import { Separator } from '@cdlab996/ui/components/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@cdlab996/ui/components/sidebar'
import {
  Activity,
  BarChart3,
  Database,
  Link2,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { NavUser } from '@/components/dashboard/nav-user'
import { SinkLogo } from '@/components/layout'

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
    href: '/dashboard/realtime',
    key: 'realtime',
    icon: Activity,
    exact: false,
  },
  {
    href: '/dashboard/check',
    key: 'check',
    icon: ShieldCheck,
    exact: false,
  },
  {
    href: '/dashboard/migrate',
    key: 'migrate',
    icon: Database,
    exact: false,
  },
  {
    href: '/dashboard/settings',
    key: 'settings',
    icon: Settings,
    exact: false,
  },
] as const

function isActive(pathname: string, item: (typeof ITEMS)[number]) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useTranslations('dashboard.nav')
  const tc = useTranslations('common')

  const active = ITEMS.find((item) => isActive(pathname, item))

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton
                size="lg"
                asChild
                className="flex-1 group-data-[collapsible=icon]:hidden"
              >
                <Link href="/dashboard">
                  <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <SinkLogo className="size-4" />
                  </span>
                  <span className="truncate font-semibold">
                    {tc('appName')}
                  </span>
                </Link>
              </SidebarMenuButton>
              <SidebarTrigger />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(pathname, item)}
                        tooltip={t(item.key)}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{t(item.key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
          <h1 className="text-base font-medium">
            {active ? t(active.key) : tc('appName')}
          </h1>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

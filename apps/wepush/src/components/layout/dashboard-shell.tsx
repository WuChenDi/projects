'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@cdlab996/ui/components/sidebar'
import { IKFooter } from '@cdlab996/ui/IK'
import type { LucideIcon } from 'lucide-react'
import { Bug, FileText, Home, ListChecks, Settings, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NavFooter } from '@/components/layout/nav-footer'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

// Core console features.
const MAIN_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '概览', icon: Home, exact: true },
  { href: '/dashboard/users', label: '接收人', icon: Users },
  { href: '/dashboard/templates', label: '模板', icon: FileText },
  { href: '/dashboard/logs', label: '日志', icon: ListChecks },
]

// Tooling / configuration, pinned below the main group.
const MANAGE_ITEMS: NavItem[] = [
  { href: '/dashboard/debug', label: '探测', icon: Bug },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
]

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive(pathname, item)}
          tooltip={item.label}
        >
          <Link href={item.href}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

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
                  <Image
                    src="https://wcd.pages.dev/logo.png"
                    alt="wepush"
                    width={24}
                    height={24}
                    className="size-6 shrink-0 rounded-full"
                    unoptimized
                  />
                  <span className="truncate font-semibold">wepush</span>
                </Link>
              </SidebarMenuButton>
              <SidebarTrigger />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>工作区</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{MAIN_ITEMS.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{MANAGE_ITEMS.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="font-semibold">wepush</span>
        </header>

        {children}
        <IKFooter year={new Date().getFullYear()} />
      </SidebarInset>
    </SidebarProvider>
  )
}

'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@cdlab996/ui/components/sidebar'
import {
  BookOpen,
  ChevronsUpDown,
  Languages,
  LogOut,
  Palette,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useTransition } from 'react'
import type { Locale } from '@/i18n/config'
import { localeLabels, locales } from '@/i18n/config'
import { setUserLocale } from '@/i18n/locale'
import { authClient } from '@/lib/auth-client'

const DOCS_HREF =
  'https://github.com/WuChenDi/projects/blob/main/apps/flnk/README.md'
const REPO_HREF = 'https://github.com/WuChenDi/projects/tree/main/apps/flnk'

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 1A11 11 0 0 0 8.52 22.44c.55.1.75-.24.75-.53v-1.86c-3.06.67-3.71-1.48-3.71-1.48-.5-1.28-1.22-1.62-1.22-1.62-1-.68.08-.67.08-.67 1.1.08 1.68 1.14 1.68 1.14.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.69-1.47-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.3 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.43 3.02-1.13 3.02-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.4.34.75 1.01.75 2.04v3.03c0 .29.2.64.76.53A11 11 0 0 0 12 1Z" />
    </svg>
  )
}

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '?'
  const parts = source.split(/\s+/u).filter(Boolean)
  const letters =
    parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)
  return letters.toUpperCase()
}

function Avatar({
  image,
  name,
  email,
}: {
  image?: string | null
  name?: string | null
  email?: string | null
}) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-xs font-medium text-primary">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote OAuth avatar; next/image adds no value (images.unoptimized)
        // biome-ignore lint/performance/noImgElement: small remote OAuth avatar; next/image adds no value (images.unoptimized)
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </span>
  )
}

export function NavUser() {
  const t = useTranslations('userMenu')
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  const [, startTransition] = useTransition()
  const { data: session, isPending } = authClient.useSession()

  const user = session?.user
  const name = user?.name
  const email = user?.email

  function onLocaleChange(value: string) {
    startTransition(async () => {
      await setUserLocale(value as Locale)
      router.refresh()
    })
  }

  async function onSignOut() {
    await authClient.signOut()
    router.replace('/dashboard/login')
  }

  if (isPending || !user) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar image={user.image} name={name} email={email} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name || email}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'top'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="size-4" />
                {t('theme')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    {t('light')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    {t('dark')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    {t('system')}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="size-4" />
                {t('language')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={locale}
                  onValueChange={onLocaleChange}
                >
                  {locales.map((l) => (
                    <DropdownMenuRadioItem key={l} value={l}>
                      {localeLabels[l]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href={DOCS_HREF} target="_blank" rel="noopener noreferrer">
                <BookOpen className="size-4" />
                {t('docs')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={REPO_HREF} target="_blank" rel="noopener noreferrer">
                <GitHubIcon />
                {t('repo')}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => void onSignOut()}>
              <LogOut className="size-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

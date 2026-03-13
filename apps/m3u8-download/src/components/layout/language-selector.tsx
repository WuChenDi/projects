'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cdlab996/ui/components/dropdown-menu'
import { LanguagesIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { startTransition, useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
] as const

export function LanguageSelector() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending] = useTransition()
  const pathname = usePathname()
  const t = useTranslations('language')

  const handleLanguageChange = (
    newLocale: (typeof languages)[number]['code'],
  ) => {
    if (newLocale === locale) return

    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname },
        { locale: newLocale },
      )
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8 cursor-pointer"
          disabled={isPending}
          aria-label={t('label')}
        >
          <LanguagesIcon
            className={`size-4 ${isPending ? 'animate-spin' : ''}`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${
              locale === language.code
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            disabled={isPending}
          >
            <span className="text-base">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {locale === language.code && (
              <span className="ml-2 text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

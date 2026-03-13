'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('theme')

  return (
    <Button
      variant="outline"
      size="icon"
      className="cursor-pointer"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={t('toggle')}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('toggle')}</span>
    </Button>
  )
}

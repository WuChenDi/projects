'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { configApi } from '@/lib/api'

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  const t = useTranslations('settings.system')
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <Badge variant={ok ? 'default' : 'secondary'}>
        {ok ? t('enabled') : t('disabled')}
      </Badge>
    </div>
  )
}

export function SettingsView() {
  const t = useTranslations('settings')
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.get(),
    staleTime: Number.POSITIVE_INFINITY,
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('appearance.title')}</CardTitle>
          <CardDescription>{t('appearance.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('language.title')}</CardTitle>
          <CardDescription>{t('language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('system.title')}</CardTitle>
          <CardDescription>{t('system.description')}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <StatusRow label={t('system.r2')} ok={config?.r2 ?? false} />
          <StatusRow
            label={t('system.analytics')}
            ok={config?.analytics ?? false}
          />
        </CardContent>
      </Card>
    </div>
  )
}

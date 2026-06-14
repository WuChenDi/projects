'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { CircleCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function DashboardOverviewPage() {
  const t = useTranslations('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
        <CircleCheck className="size-4 text-emerald-500" />
        {t('overview.signedIn')}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.totalLinks')}</CardTitle>
          <CardDescription>{t('overview.comingSoon')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tabular-nums">—</div>
        </CardContent>
      </Card>
    </div>
  )
}

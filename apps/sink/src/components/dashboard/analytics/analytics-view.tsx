'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { CountersCards } from '@/components/dashboard/analytics/counters'
import { MetricGroup } from '@/components/dashboard/analytics/metric-group'
import { ViewsChart } from '@/components/dashboard/analytics/views-chart'
import { statsApi } from '@/lib/api'

const DAY = 24 * 60 * 60 * 1000
const RANGES: Record<string, number> = {
  '1d': DAY,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
  '90d': 90 * DAY,
}
const GROUPS = [
  { key: 'location', dims: ['country', 'region', 'city'] },
  { key: 'referer', dims: ['referer', 'slug'] },
  { key: 'time', dims: ['language', 'timezone'] },
  { key: 'device', dims: ['device', 'deviceType'] },
  { key: 'browser', dims: ['os', 'browser', 'browserType'] },
] as const

export function AnalyticsView() {
  const t = useTranslations('analytics')
  const [range, setRange] = useState('7d')
  const [filters, setFilters] = useState<Record<string, string>>({})

  // endAt is captured when the range changes so query keys stay stable.
  const dateWindow = useMemo(() => {
    const end = Date.now()
    return { startAt: end - RANGES[range]!, endAt: end }
  }, [range])
  const params = useMemo(
    () => ({ ...dateWindow, filters }),
    [dateWindow, filters],
  )

  const counters = useQuery({
    queryKey: ['counters', params],
    queryFn: () => statsApi.counters(params),
  })
  const views = useQuery({
    queryKey: ['views', params],
    queryFn: () => statsApi.views(params),
  })

  function drill(dim: string, value: string) {
    setFilters((f) => ({ ...f, [dim]: value }))
  }
  function removeFilter(dim: string) {
    setFilters((f) =>
      Object.fromEntries(Object.entries(f).filter(([k]) => k !== dim)),
    )
  }

  const activeFilters = Object.entries(filters)
  const notConfigured = counters.data?.configured === false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(RANGES).map((r) => (
              <SelectItem key={r} value={r}>
                {t(`range.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {notConfigured && (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {t('notConfigured')}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(([dim, value]) => (
            <Badge key={dim} variant="secondary" className="gap-1">
              <span className="text-muted-foreground">
                {t(`metrics.${dim}`)}:
              </span>
              {value}
              <button type="button" onClick={() => removeFilter(dim)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            {t('clearFilters')}
          </Button>
        </div>
      )}

      <CountersCards data={counters.data} loading={counters.isLoading} />
      <ViewsChart data={views.data?.views ?? []} loading={views.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <MetricGroup
            key={g.key}
            titleKey={g.key}
            dims={[...g.dims]}
            params={params}
            onDrill={drill}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlaceholderCard title={t('placeholders.map')} hint={t('comingSoon')} />
        <PlaceholderCard
          title={t('placeholders.realtime')}
          hint={t('comingSoon')}
        />
      </div>
    </div>
  )
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
          {hint}
        </div>
      </CardContent>
    </Card>
  )
}

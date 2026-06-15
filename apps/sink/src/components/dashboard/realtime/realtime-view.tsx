'use client'

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
import { Globe } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { ViewsChart } from '@/components/dashboard/analytics/views-chart'
import { statsApi } from '@/lib/api'

const MIN = 60 * 1000
const WINDOWS: Record<string, number> = {
  '1h': 60 * MIN,
  '6h': 6 * 60 * MIN,
  '24h': 24 * 60 * MIN,
}
const EVENTS_INTERVAL = 12_000
const CHART_INTERVAL = 15_000

// AE returns UTC "YYYY-MM-DD HH:MM:SS"; render as local time.
function localTime(ts: string, locale: string): string {
  const d = new Date(ts.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime())
    ? ts
    : d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export function RealtimeView() {
  const t = useTranslations('realtime')
  const locale = useLocale()
  const [windowKey, setWindowKey] = useState('6h')

  // refetchIntervalInBackground defaults to false, so polling pauses when the
  // tab is hidden — exactly the desired realtime behaviour.
  const events = useQuery({
    queryKey: ['rt-events'],
    queryFn: () => statsApi.events({}),
    refetchInterval: EVENTS_INTERVAL,
  })
  const views = useQuery({
    queryKey: ['rt-views', windowKey],
    queryFn: () => {
      const end = Date.now()
      return statsApi.views({ startAt: end - WINDOWS[windowKey]!, endAt: end })
    },
    refetchInterval: CHART_INTERVAL,
  })

  const rows = events.data?.events ?? []
  const notConfigured =
    events.data?.configured === false || views.data?.configured === false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Select value={windowKey} onValueChange={setWindowKey}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(WINDOWS).map((w) => (
              <SelectItem key={w} value={w}>
                {t(`window.${w}`)}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('chart.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ViewsChart
            data={views.data?.views ?? []}
            loading={views.isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {t('events.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.isLoading ? (
            <div className="h-40 animate-pulse rounded-md bg-muted" />
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {t('events.empty')}
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((e) => (
                <li
                  key={`${e.timestamp}-${e.slug}-${e.city}-${e.browser}-${e.os}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">/{e.slug}</span>
                    <span className="truncate text-muted-foreground">
                      {[e.city, e.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">
                      {[e.os, e.browser, e.deviceType]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="tabular-nums">
                      {localTime(e.timestamp, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

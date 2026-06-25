'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { Globe2, Link2, MousePointerClick, Share2, Users } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { linkApi, statsApi } from '@/lib/api'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export default function DashboardOverviewPage() {
  const t = useTranslations('dashboard')
  const tAnalytics = useTranslations('analytics')

  // Fixed at first render — the 30d window is anchored to page load.
  const startAt = useMemo(() => Date.now() - THIRTY_DAYS, [])

  const countQuery = useQuery({
    queryKey: ['link-count'],
    queryFn: () => linkApi.count(),
  })
  const countersQuery = useQuery({
    queryKey: ['overview-counters', startAt],
    queryFn: () => statsApi.counters({ startAt }),
  })
  const topLinksQuery = useQuery({
    queryKey: ['overview-top-links', startAt],
    queryFn: () => statsApi.metrics('slug', { startAt }),
  })
  const topCountriesQuery = useQuery({
    queryKey: ['overview-top-countries', startAt],
    queryFn: () => statsApi.metrics('country', { startAt }),
  })

  const configured = countersQuery.data?.configured ?? true
  const counters = countersQuery.data
  const topLinks = (topLinksQuery.data?.metrics ?? []).slice(0, 5)
  const topCountries = (topCountriesQuery.data?.metrics ?? []).slice(0, 5)

  const stats = [
    {
      key: 'totalLinks',
      icon: Link2,
      value: countQuery.data?.total ?? 0,
      loading: countQuery.isLoading,
      gated: false,
    },
    {
      key: 'totalVisits',
      icon: MousePointerClick,
      value: counters?.visits ?? 0,
      loading: countersQuery.isLoading,
      gated: true,
    },
    {
      key: 'totalVisitors',
      icon: Users,
      value: counters?.visitors ?? 0,
      loading: countersQuery.isLoading,
      gated: true,
    },
    {
      key: 'totalReferers',
      icon: Share2,
      value: counters?.referers ?? 0,
      loading: countersQuery.isLoading,
      gated: true,
    },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.key}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`overview.${s.key}`)}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {s.loading ? (
                  <Skeleton className="h-9 w-20" />
                ) : s.gated && !configured ? (
                  <p className="text-sm text-muted-foreground">
                    {tAnalytics('notConfigured')}
                  </p>
                ) : (
                  <div className="text-3xl font-bold tabular-nums">
                    {s.value}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.topLinks')}</CardTitle>
            <CardDescription>{t('overview.last30Days')}</CardDescription>
          </CardHeader>
          <CardContent>
            {topLinksQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : topLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tAnalytics('noData')}
              </p>
            ) : (
              <ul className="divide-y">
                {topLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={`/dashboard/analytics?slug=${encodeURIComponent(item.name)}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="truncate font-medium">/{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>{t('overview.topCountries')}</CardTitle>
              <CardDescription>{t('overview.last30Days')}</CardDescription>
            </div>
            <Globe2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topCountriesQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : topCountries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tAnalytics('noData')}
              </p>
            ) : (
              <ul className="divide-y">
                {topCountries.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-4 py-2 text-sm"
                  >
                    <span className="truncate font-medium">
                      {item.name || '—'}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import type { ChartConfig } from '@cdlab996/ui/components/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@cdlab996/ui/components/chart'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { Link2, MousePointerClick, Share2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { linkApi, statsApi } from '@/lib/api'
import { formatNumber } from '@/lib/format'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

const TOP_CHART_CONFIG = {
  count: { label: '', color: 'var(--chart-1)' },
} satisfies ChartConfig

// Horizontal bar chart shared by the "top links" / "top countries" cards.
// `formatName` controls the axis label; `onSelect` makes the bars clickable.
function TopBarChart({
  data,
  formatName,
  onSelect,
}: {
  data: { name: string; count: number }[]
  formatName: (name: string) => string
  onSelect?: (name: string) => void
}) {
  const locale = useLocale()
  const chartData = data.map((d) => ({ ...d, label: formatName(d.name) }))
  const chartHeight = Math.max(120, data.length * 44)

  return (
    <ChartContainer
      config={TOP_CHART_CONFIG}
      className="aspect-auto w-full"
      style={{ height: chartHeight }}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 4, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          width={80}
          tickFormatter={(v: string) =>
            v.length > 12 ? `${v.slice(0, 11)}…` : v
          }
        />
        <XAxis type="number" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => formatNumber(Number(value), locale)}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={4}
          maxBarSize={32}
          className={onSelect ? 'cursor-pointer' : undefined}
          onClick={
            onSelect
              ? (_, index) => onSelect(chartData[index]!.name)
              : undefined
          }
        />
      </BarChart>
    </ChartContainer>
  )
}

export default function DashboardOverviewPage() {
  const t = useTranslations('dashboard')
  const tAnalytics = useTranslations('analytics')
  const router = useRouter()

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
                <CardAction>
                  <Icon className="size-4 text-muted-foreground" />
                </CardAction>
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
              <TopBarChart
                data={topLinks}
                formatName={(name) => `/${name}`}
                onSelect={(name) =>
                  router.push(
                    `/dashboard/analytics?slug=${encodeURIComponent(name)}`,
                  )
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>{t('overview.topCountries')}</CardTitle>
              <CardDescription>{t('overview.last30Days')}</CardDescription>
            </div>
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
              <TopBarChart
                data={topCountries}
                formatName={(name) => name || '—'}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

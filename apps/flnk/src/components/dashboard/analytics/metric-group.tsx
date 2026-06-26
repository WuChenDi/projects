'use client'

import {
  Card,
  CardAction,
  CardContent,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { IKEmpty } from '@cdlab996/ui/IK/IKEmpty'
import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { StatsParams } from '@/lib/api'
import { statsApi } from '@/lib/api'
import { formatNumber } from '@/lib/format'

function MetricList({
  type,
  params,
  onDrill,
}: {
  type: string
  params: StatsParams
  onDrill: (dim: string, value: string) => void
}) {
  const t = useTranslations('analytics')
  const locale = useLocale()
  const query = useQuery({
    queryKey: ['metrics', type, params],
    queryFn: () => statsApi.metrics(type, params),
  })
  const rows = query.data?.metrics ?? []

  if (query.isLoading) {
    return <Skeleton className="h-40 w-full" />
  }
  if (rows.length === 0) {
    return <IKEmpty className="h-40" title={t('noData')} icon={Inbox} />
  }

  const config = {
    count: { label: t(`metrics.${type}`), color: 'var(--chart-1)' },
  } satisfies ChartConfig

  // Horizontal bars read better than vertical ones when only a few categories
  // come back — height scales with the row count so bars stay evenly spaced.
  const chartHeight = Math.max(140, rows.length * 44)

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: chartHeight }}
    >
      <BarChart
        accessibilityLayer
        data={rows}
        layout="vertical"
        margin={{ left: 4, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
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
          className="cursor-pointer"
          onClick={(_, index) => onDrill(type, rows[index]!.name)}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function MetricGroup({
  titleKey,
  dims,
  params,
  onDrill,
}: {
  titleKey: string
  dims: string[]
  params: StatsParams
  onDrill: (dim: string, value: string) => void
}) {
  const t = useTranslations('analytics')
  const [tab, setTab] = useState(dims[0]!)

  return (
    <Card>
      <Tabs value={tab} onValueChange={setTab}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t(`groups.${titleKey}`)}</CardTitle>
          <CardAction>
            <TabsList>
              {dims.map((dim) => (
                <TabsTrigger key={dim} value={dim}>
                  {t(`metrics.${dim}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent>
          {dims.map((dim) => (
            <TabsContent key={dim} value={dim}>
              <MetricList type={dim} params={params} onDrill={onDrill} />
            </TabsContent>
          ))}
        </CardContent>
      </Tabs>
    </Card>
  )
}

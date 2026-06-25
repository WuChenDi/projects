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
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
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

  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <BarChart accessibilityLayer data={rows} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={11}
          interval={0}
          tickFormatter={(v: string) =>
            v.length > 10 ? `${v.slice(0, 9)}…` : v
          }
        />
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
          maxBarSize={40}
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

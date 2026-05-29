'use client'

import { Button } from '@cdlab996/ui/components/button'
import type { ChartConfig } from '@cdlab996/ui/components/chart'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@cdlab996/ui/components/chart'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

interface DayStats {
  date: string
  total: number
  success: number
  failed: number
}

async function fetchTrend(days: number): Promise<{ days: DayStats[] }> {
  const res = await fetch(`/api/stats/trend?days=${days}`)
  if (!res.ok) throw new Error('Failed to load trend')
  return res.json()
}

const chartConfig = {
  success: {
    label: '成功',
    color: '#22c55e',
  },
  failed: {
    label: '失败',
    color: '#ef4444',
  },
} satisfies ChartConfig

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

export function TrendChart() {
  const [days, setDays] = useState<7 | 30>(7)

  const { data, isLoading } = useQuery({
    queryKey: ['trend', days],
    queryFn: () => fetchTrend(days),
  })

  const totalPushes = data?.days.reduce((s, d) => s + d.total, 0) ?? 0
  const totalFailed = data?.days.reduce((s, d) => s + d.failed, 0) ?? 0

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">推送趋势</span>
          {!isLoading && totalPushes > 0 ? (
            <span className="text-xs text-muted-foreground">
              近 {days} 天共 {totalPushes} 次
              {totalFailed > 0 ? (
                <span className="ml-1 text-destructive/70">
                  · {totalFailed} 失败
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <div className="flex gap-1">
          {([7, 30] as const).map((d) => (
            <Button
              key={d}
              variant={days === d ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setDays(d)}
            >
              {d}天
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card px-2 pb-2 pt-4 sm:px-4">
        {isLoading ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : !data || data.days.every((d) => d.total === 0) ? (
          <div className="flex h-60 items-center justify-center text-xs text-muted-foreground">
            近 {days} 天暂无推送记录
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-60 w-full"
          >
            <AreaChart data={data.days}>
              <defs>
                <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-success)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-success)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-failed)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-failed)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatDate}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(value as string)}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="failed"
                type="natural"
                fill="url(#fillFailed)"
                stroke="var(--color-failed)"
                stackId="a"
              />
              <Area
                dataKey="success"
                type="natural"
                fill="url(#fillSuccess)"
                stroke="var(--color-success)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </section>
  )
}

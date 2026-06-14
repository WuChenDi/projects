'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { useTranslations } from 'next-intl'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ViewPoint } from '@/lib/api'

export function ViewsChart({
  data,
  loading,
}: {
  data: ViewPoint[]
  loading: boolean
}) {
  const t = useTranslations('analytics')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('views.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[260px] animate-pulse rounded-md bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            {t('noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                name={t('counters.visits')}
                stroke="var(--primary)"
                fill="url(#visitsFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

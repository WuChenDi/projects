'use client'

import type { ChartConfig } from '@cdlab/ui/components/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@cdlab/ui/components/chart'
import { useLocale } from 'next-intl'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { formatNumber } from '@/lib/format/format'

const TOP_CHART_CONFIG = {
  count: { label: '', color: 'var(--chart-1)' },
} satisfies ChartConfig

// Horizontal bar chart shared by the "top links" / "top countries" cards.
// `formatName` controls the axis label; `onSelect` makes the bars clickable.
// Kept in its own client-only module so the overview page can lazy-load it with
// `ssr: false` — recharts' large d3 dependency tree then stays out of the
// Worker's server bundle.
export function TopBarChart({
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

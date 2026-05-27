'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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

function Bars({ data }: { data: DayStats[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="flex items-end gap-1" style={{ height: 72 }}>
      {data.map((day) => {
        const successH = Math.round((day.success / max) * 64)
        const failedH = Math.round((day.failed / max) * 64)
        const totalH = successH + failedH
        const label = day.date.slice(5) // MM-DD

        return (
          <div
            key={day.date}
            className="group relative flex flex-1 flex-col items-center justify-end"
            style={{ height: 72 }}
          >
            {/* Tooltip */}
            {day.total > 0 ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs shadow-md group-hover:block">
                <span className="text-primary">{day.success} 成功</span>
                {day.failed > 0 ? (
                  <span className="ml-1.5 text-destructive">
                    {day.failed} 失败
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Bar stack */}
            <div
              className="w-full min-w-[6px] overflow-hidden rounded-sm"
              style={{ height: totalH || 2 }}
            >
              {day.failed > 0 ? (
                <div
                  className="w-full bg-destructive/70"
                  style={{
                    height: `${Math.round((day.failed / (day.total || 1)) * 100)}%`,
                  }}
                />
              ) : null}
              <div
                className="w-full bg-primary/70"
                style={{
                  height: `${Math.round((day.success / (day.total || 1)) * 100)}%`,
                }}
              />
            </div>

            {/* Date label */}
            <span className="mt-1.5 font-mono text-[9px] text-muted-foreground">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
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

      <div className="rounded-xl border bg-card px-4 pb-2 pt-4">
        {isLoading ? (
          <div className="flex items-end gap-1" style={{ height: 72 }}>
            {(days === 7
              ? ['a', 'b', 'c', 'd', 'e', 'f', 'g']
              : [
                  'a',
                  'b',
                  'c',
                  'd',
                  'e',
                  'f',
                  'g',
                  'h',
                  'i',
                  'j',
                  'k',
                  'l',
                  'm',
                  'n',
                  'o',
                ]
            ).map((k, i) => (
              <Skeleton
                key={k}
                className="flex-1"
                style={{
                  height: `${[55, 35, 70, 45, 60, 30, 50, 65, 40, 55, 45, 70, 35, 60, 50][i % 15]}%`,
                }}
              />
            ))}
          </div>
        ) : !data || data.days.every((d) => d.total === 0) ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{ height: 72 }}
          >
            近 {days} 天暂无推送记录
          </div>
        ) : (
          <Bars data={data.days} />
        )}
        <div className="mt-2 flex items-center gap-3 border-t pt-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary/70" />
            成功
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm bg-destructive/70" />
            失败
          </span>
        </div>
      </div>
    </section>
  )
}

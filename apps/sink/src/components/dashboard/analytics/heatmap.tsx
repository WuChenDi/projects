'use client'

import { useLocale } from 'next-intl'
import { useMemo } from 'react'
import type { HeatmapCell } from '@/lib/api'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const WEEKDAYS = Array.from({ length: 7 }, (_, d) => d) // 0=Sunday .. 6=Saturday

// Localized short weekday label. 2023-01-01 is a Sunday (weekday 0).
function weekdayLabel(weekday: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
    new Date(Date.UTC(2023, 0, 1 + weekday)),
  )
}

export function Heatmap({ data }: { data: HeatmapCell[] }) {
  const locale = useLocale()
  const { lookup, max } = useMemo(() => {
    const map = new Map<string, number>()
    let peak = 0
    for (const c of data) {
      map.set(`${c.weekday}-${c.hour}`, c.visits)
      if (c.visits > peak) peak = c.visits
    }
    return { lookup: map, max: peak || 1 }
  }, [data])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex">
          <div className="w-10 shrink-0" />
          <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
            {HOURS.map((h) => (
              <div
                key={h}
                className="text-center text-[9px] text-muted-foreground"
              >
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
        </div>
        {WEEKDAYS.map((d) => (
          <div key={d} className="mt-0.5 flex items-center">
            <div className="w-10 shrink-0 pr-1 text-right text-[10px] text-muted-foreground">
              {weekdayLabel(d, locale)}
            </div>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
              {HOURS.map((h) => {
                const visits = lookup.get(`${d}-${h}`) ?? 0
                const intensity = visits / max
                return (
                  <div
                    key={h}
                    title={`${visits}`}
                    className="aspect-square rounded-[2px] bg-primary"
                    style={{
                      opacity: visits === 0 ? 0.06 : 0.15 + intensity * 0.85,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

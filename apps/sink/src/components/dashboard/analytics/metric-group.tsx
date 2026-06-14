'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cdlab996/ui/components/tabs'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { StatsParams } from '@/lib/api'
import { statsApi } from '@/lib/api'

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
  const query = useQuery({
    queryKey: ['metrics', type, params],
    queryFn: () => statsApi.metrics(type, params),
  })
  const rows = query.data?.metrics ?? []
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1

  if (query.isLoading) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" />
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {t('noData')}
      </div>
    )
  }
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.name}>
          <button
            type="button"
            onClick={() => onDrill(type, row.name)}
            className="relative flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
            <span className="relative z-10 truncate pr-2">{row.name}</span>
            <span className="relative z-10 tabular-nums text-muted-foreground">
              {row.count.toLocaleString()}
            </span>
          </button>
        </li>
      ))}
    </ul>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t(`groups.${titleKey}`)}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            {dims.map((dim) => (
              <TabsTrigger key={dim} value={dim}>
                {t(`metrics.${dim}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {dims.map((dim) => (
            <TabsContent key={dim} value={dim}>
              <MetricList type={dim} params={params} onDrill={onDrill} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

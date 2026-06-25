'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { useLocale, useTranslations } from 'next-intl'
import type { Counters } from '@/lib/api'
import { formatNumber } from '@/lib/format'

export function CountersCards({
  data,
  loading,
}: {
  data?: Counters
  loading: boolean
}) {
  const t = useTranslations('analytics.counters')
  const locale = useLocale()
  const items = [
    { key: 'visits', value: data?.visits ?? 0 },
    { key: 'visitors', value: data?.visitors ?? 0 },
    { key: 'referers', value: data?.referers ?? 0 },
  ] as const

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t(item.key)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                formatNumber(item.value, locale)
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

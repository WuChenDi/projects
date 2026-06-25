'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { MousePointerClick, Share2, Users } from 'lucide-react'
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
    { key: 'visits', value: data?.visits ?? 0, icon: MousePointerClick },
    { key: 'visitors', value: data?.visitors ?? 0, icon: Users },
    { key: 'referers', value: data?.referers ?? 0, icon: Share2 },
  ] as const

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(item.key)}
              </CardTitle>
              <CardAction>
                <Icon className="size-4 text-muted-foreground" />
              </CardAction>
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
        )
      })}
    </div>
  )
}

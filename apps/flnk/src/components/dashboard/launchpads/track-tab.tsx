'use client'

import { Card } from '@cdlab/ui/components/card'
import { Skeleton } from '@cdlab/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Eye, MousePointerClick } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { LaunchpadConfig } from '@/database/schema'
import { launchpadApi } from '@/lib/api'
import { formatNumber } from '@/lib/format'

// Stats window for headline + per-block totals — wide enough to read as
// "all-time" given Analytics Engine retention.
const STATS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000

interface TrackTabProps {
  launchpadId: string | null
  config: LaunchpadConfig
}

export function TrackTab({ launchpadId, config }: TrackTabProps) {
  const t = useTranslations('launchpads')
  const locale = useLocale()

  const query = useQuery({
    queryKey: ['launchpad-stats', launchpadId],
    enabled: Boolean(launchpadId),
    queryFn: () =>
      launchpadApi.stats(launchpadId!, Date.now() - STATS_WINDOW_MS),
  })

  if (!launchpadId) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('track.saveFirst')}
      </p>
    )
  }
  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )
  }
  if (query.data && !query.data.configured) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('track.notConfigured')}
      </p>
    )
  }

  const stats = query.data
  const counts = new Map(stats?.blocks.map((b) => [b.blockId, b.count]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 p-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            {t('track.views')}
          </span>
          <span className="text-2xl font-semibold">
            {formatNumber(stats?.views ?? 0, locale)}
          </span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5" />
            {t('track.engagements')}
          </span>
          <span className="text-2xl font-semibold">
            {formatNumber(stats?.engagements ?? 0, locale)}
          </span>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <BarChart3 className="size-4" />
          {t('track.perBlock')}
        </h3>
        {config.blocks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('track.noBlocks')}
          </p>
        ) : (
          <Card className="divide-y p-0">
            {config.blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {t(`block.type.${block.type}`)}
                </span>
                <span className="font-medium tabular-nums">
                  {formatNumber(counts.get(block.id) ?? 0, locale)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}

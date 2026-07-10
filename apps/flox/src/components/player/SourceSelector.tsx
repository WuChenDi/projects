'use client'

import { Badge } from '@cdlab/ui/components/badge'
import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { ScrollArea } from '@cdlab/ui/components/scroll-area'
import { cn } from '@cdlab/ui/lib/utils'
import { LayersIcon, PlayIcon, RefreshCwIcon } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LatencyBadge } from '@/components/ui/LatencyBadge'
import type { ResolutionInfo } from '@/lib/hooks/useResolutionProbe'
import { extractQualityLabel } from '@/lib/utils/video'
import type { VideoResolutionInfo } from './hooks/useVideoResolution'

export interface SourceInfo {
  id: string | number
  source: string
  sourceName?: string
  latency?: number
  pic?: string
  remarks?: string
}

interface SourceSelectorProps {
  sources: SourceInfo[]
  currentSource: string
  onSourceChange: (source: SourceInfo) => void
  currentResolution?: VideoResolutionInfo | null
  sourceResolutions?: Record<string, ResolutionInfo | null>
  className?: string
}

export function SourceSelector({
  sources,
  currentSource,
  onSourceChange,
  currentResolution,
  sourceResolutions,
  className,
}: SourceSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [latencies, setLatencies] = useState<Record<string, number>>({})

  const getResBadge = (source: SourceInfo, isCurrent: boolean) => {
    if (isCurrent && currentResolution) {
      return { label: currentResolution.label, color: currentResolution.color }
    }
    const probeKey = `${source.source}:${source.id}`
    const probed = sourceResolutions?.[probeKey]
    if (probed) return { label: probed.label, color: probed.color }
    return extractQualityLabel(source.remarks) || null
  }

  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => {
      const latA = latencies[a.source] ?? a.latency ?? Infinity
      const latB = latencies[b.source] ?? b.latency ?? Infinity
      return latA - latB
    })
  }, [sources, latencies])

  const refreshLatencies = useCallback(async () => {
    setIsLoading(true)
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: source.source }),
          })
          if (response.ok) {
            const data = await response.json()
            return { source: source.source, latency: data.latency }
          }
        } catch {}
        return { source: source.source, latency: undefined }
      }),
    )
    const newLatencies: Record<string, number> = {}
    results.forEach(({ source, latency }) => {
      if (latency !== undefined) newLatencies[source] = latency
    })
    setLatencies(newLatencies)
    setIsLoading(false)
  }, [sources])

  useEffect(() => {
    const initial: Record<string, number> = {}
    sources.forEach((s) => {
      if (s.latency !== undefined) initial[s.source] = s.latency
    })
    setLatencies(initial)
  }, [sources])

  if (sources.length <= 1) return null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayersIcon className="size-4" />
          <CardTitle>来源</CardTitle>
          {sources && <Badge variant="secondary">{sources.length}</Badge>}
        </div>
        <CardAction>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={refreshLatencies}
            disabled={isLoading}
          >
            <RefreshCwIcon
              className={cn('size-3.5', isLoading && 'animate-spin')}
            />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1.5 pr-3">
            {sortedSources.map((source, index) => {
              const isCurrent = source.source === currentSource
              const latency = latencies[source.source] ?? source.latency

              return (
                <button
                  key={source.source}
                  onClick={() => !isCurrent && onSourceChange(source)}
                  disabled={isCurrent}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary cursor-default'
                      : 'bg-card hover:bg-accent border-border cursor-pointer',
                  )}
                >
                  {source.pic && (
                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
                      <Image
                        src={source.pic}
                        alt=""
                        width={40}
                        height={56}
                        className="w-full h-full object-cover"
                        unoptimized
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display =
                            'none'
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      {source.sourceName || source.source}
                      {(() => {
                        const badge = getResBadge(source, isCurrent)
                        return badge ? (
                          <span
                            className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-bold text-white ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        ) : null
                      })()}
                    </div>
                    {latency !== undefined && (
                      <div className="mt-0.5">
                        <LatencyBadge latency={latency} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isCurrent && index < 3 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          index === 0 && 'border-yellow-500 text-yellow-600',
                          index === 1 && 'border-slate-400 text-slate-500',
                          index === 2 && 'border-orange-400 text-orange-500',
                        )}
                      >
                        #{index + 1}
                      </Badge>
                    )}
                    {isCurrent && <PlayIcon className="size-3.5" />}
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

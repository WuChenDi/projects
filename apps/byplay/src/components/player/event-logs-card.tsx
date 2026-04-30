'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { IKEmpty } from '@cdlab996/ui/IK'
import { cn } from '@cdlab996/ui/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { HlsLogEntry } from '@/hooks/use-hls-player'
import { LogBadge } from './shared-fields'

interface EventLogsCardProps {
  logs: HlsLogEntry[]
  onClear: () => void
}

export function EventLogsCard({ logs, onClear }: EventLogsCardProps) {
  const t = useTranslations('logs')
  const [collapsed, setCollapsed] = useState(false)

  const toggleLabel = collapsed ? t('expand') : t('collapse')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={toggleLabel}
          >
            <ChevronDown className={cn('size-4', collapsed && '-rotate-90')} />
          </Button>
          <span>{t('title')}</span>
          {logs.length > 0 && (
            <Badge variant="secondary">
              {t('count', { count: logs.length })}
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <Button variant="secondary" size="sm" onClick={onClear}>
            {t('clear')}
          </Button>
        </CardAction>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          <ScrollArea className="h-[240px]">
            {logs.length === 0 ? (
              <IKEmpty
                title={t('emptyTitle')}
                description={t('emptyDesc')}
                showIcon={false}
              />
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                    key={`${log.time}-${log.event}-${i}`}
                    className="flex items-start gap-2 py-0.5"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {log.time}
                    </span>
                    <LogBadge type={log.type} />
                    <span className="text-muted-foreground shrink-0">
                      {log.event}
                    </span>
                    <span className="break-all">{log.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  )
}

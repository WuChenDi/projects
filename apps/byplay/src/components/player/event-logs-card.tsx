'use client'

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
import { useTranslations } from 'next-intl'
import type { HlsLogEntry } from '@/hooks/use-hls-player'
import { LogBadge } from './shared-fields'

interface EventLogsCardProps {
  logs: HlsLogEntry[]
  onClear: () => void
}

export function EventLogsCard({ logs, onClear }: EventLogsCardProps) {
  const t = useTranslations('logs')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardAction>
          <Button variant="secondary" size="sm" onClick={onClear}>
            {t('clear')}
          </Button>
        </CardAction>
      </CardHeader>
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
    </Card>
  )
}

'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { FieldGroup } from '@cdlab996/ui/components/field'
import { useTranslations } from 'next-intl'
import type { HlsConfig } from '@/hooks/use-hls-player'
import { SwitchField } from './shared-fields'

interface PerformanceCardProps {
  config: HlsConfig
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
}

export function PerformanceCard({
  config,
  onUpdateConfig,
}: PerformanceCardProps) {
  const t = useTranslations('performance')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <SwitchField
            label={t('enableWorker')}
            description={t('enableWorkerDesc')}
            checked={config.enableWorker}
            onCheckedChange={(v) => onUpdateConfig('enableWorker', v)}
          />
          <SwitchField
            label={t('lowLatencyMode')}
            description={t('lowLatencyModeDesc')}
            checked={config.lowLatencyMode}
            onCheckedChange={(v) => onUpdateConfig('lowLatencyMode', v)}
          />
          <SwitchField
            label={t('startFragPrefetch')}
            description={t('startFragPrefetchDesc')}
            checked={config.startFragPrefetch}
            onCheckedChange={(v) => onUpdateConfig('startFragPrefetch', v)}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

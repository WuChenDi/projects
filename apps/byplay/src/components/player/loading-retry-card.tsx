'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { FieldGroup } from '@cdlab996/ui/components/field'
import { useTranslations } from 'next-intl'
import type { HlsConfig } from '@/hooks/use-hls-player'
import { SliderField } from './shared-fields'

interface LoadingRetryCardProps {
  config: HlsConfig
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
}

export function LoadingRetryCard({
  config,
  onUpdateConfig,
}: LoadingRetryCardProps) {
  const t = useTranslations('loading')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <SliderField
            label={t('fragTimeout')}
            description={t('fragTimeoutDesc')}
            value={config.fragLoadingTimeOut / 1000}
            min={5}
            max={60}
            step={1}
            unit="s"
            onChange={(v) => onUpdateConfig('fragLoadingTimeOut', v * 1000)}
          />
          <SliderField
            label={t('manifestTimeout')}
            description={t('manifestTimeoutDesc')}
            value={config.manifestLoadingTimeOut / 1000}
            min={5}
            max={60}
            step={1}
            unit="s"
            onChange={(v) =>
              onUpdateConfig('manifestLoadingTimeOut', v * 1000)
            }
          />
          <SliderField
            label={t('levelTimeout')}
            description={t('levelTimeoutDesc')}
            value={config.levelLoadingTimeOut / 1000}
            min={5}
            max={60}
            step={1}
            unit="s"
            onChange={(v) => onUpdateConfig('levelLoadingTimeOut', v * 1000)}
          />
          <SliderField
            label={t('fragMaxRetry')}
            description={t('fragMaxRetryDesc')}
            value={config.fragLoadingMaxRetry}
            min={0}
            max={20}
            step={1}
            onChange={(v) => onUpdateConfig('fragLoadingMaxRetry', v)}
          />
          <SliderField
            label={t('manifestMaxRetry')}
            description={t('manifestMaxRetryDesc')}
            value={config.manifestLoadingMaxRetry}
            min={0}
            max={10}
            step={1}
            onChange={(v) => onUpdateConfig('manifestLoadingMaxRetry', v)}
          />
          <SliderField
            label={t('levelMaxRetry')}
            description={t('levelMaxRetryDesc')}
            value={config.levelLoadingMaxRetry}
            min={0}
            max={10}
            step={1}
            onChange={(v) => onUpdateConfig('levelLoadingMaxRetry', v)}
          />
          <SliderField
            label={t('fragRetryDelay')}
            description={t('fragRetryDelayDesc')}
            value={config.fragLoadingRetryDelay}
            min={500}
            max={10000}
            step={500}
            unit="ms"
            onChange={(v) => onUpdateConfig('fragLoadingRetryDelay', v)}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

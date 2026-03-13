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

interface AbrCardProps {
  config: HlsConfig
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
}

export function AbrCard({ config, onUpdateConfig }: AbrCardProps) {
  const t = useTranslations('abr')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <SliderField
            label={t('defaultEstimate')}
            description={t('defaultEstimateDesc')}
            value={config.abrEwmaDefaultEstimate / 1000}
            min={100}
            max={5000}
            step={100}
            unit=" Kbps"
            onChange={(v) =>
              onUpdateConfig('abrEwmaDefaultEstimate', v * 1000)
            }
          />
          <SliderField
            label={t('bandwidthFactorDown')}
            description={t('bandwidthFactorDownDesc')}
            value={config.abrBandWidthFactor}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => onUpdateConfig('abrBandWidthFactor', v)}
          />
          <SliderField
            label={t('bandwidthFactorUp')}
            description={t('bandwidthFactorUpDesc')}
            value={config.abrBandWidthUpFactor}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => onUpdateConfig('abrBandWidthUpFactor', v)}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

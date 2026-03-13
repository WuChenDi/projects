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

interface BufferCardProps {
  config: HlsConfig
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
}

export function BufferCard({ config, onUpdateConfig }: BufferCardProps) {
  const t = useTranslations('buffer')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <SliderField
            label={t('maxBufferLength')}
            description={t('maxBufferLengthDesc')}
            value={config.maxBufferLength}
            min={5}
            max={120}
            step={5}
            unit="s"
            onChange={(v) => onUpdateConfig('maxBufferLength', v)}
          />
          <SliderField
            label={t('maxMaxBufferLength')}
            description={t('maxMaxBufferLengthDesc')}
            value={config.maxMaxBufferLength}
            min={30}
            max={600}
            step={10}
            unit="s"
            onChange={(v) => onUpdateConfig('maxMaxBufferLength', v)}
          />
          <SliderField
            label={t('maxBufferSize')}
            description={t('maxBufferSizeDesc')}
            value={config.maxBufferSize / (1000 * 1000)}
            min={10}
            max={200}
            step={10}
            unit=" MB"
            onChange={(v) => onUpdateConfig('maxBufferSize', v * 1000 * 1000)}
          />
          <SliderField
            label={t('maxBufferHole')}
            description={t('maxBufferHoleDesc')}
            value={config.maxBufferHole}
            min={0.1}
            max={2}
            step={0.1}
            unit="s"
            onChange={(v) => onUpdateConfig('maxBufferHole', v)}
          />
          <SliderField
            label={t('backBufferLength')}
            description={t('backBufferLengthDesc')}
            value={config.backBufferLength}
            min={0}
            max={120}
            step={5}
            unit="s"
            onChange={(v) => onUpdateConfig('backBufferLength', v)}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

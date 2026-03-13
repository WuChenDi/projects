'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@cdlab996/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import { useTranslations } from 'next-intl'
import type { HlsConfig, HlsPlayerState } from '@/hooks/use-hls-player'
import { SwitchField, formatBitrate } from './shared-fields'

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

interface PlaybackCardProps {
  config: HlsConfig
  playbackRate: number
  state: HlsPlayerState
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
  onRateChange: (rate: number) => void
  onResetConfig: () => void
  onSetLevel: (level: number) => void
}

export function PlaybackCard({
  config,
  playbackRate,
  state,
  onUpdateConfig,
  onRateChange,
  onResetConfig,
  onSetLevel,
}: PlaybackCardProps) {
  const t = useTranslations('playback')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardAction>
          <Button variant="secondary" size="sm" onClick={onResetConfig}>
            {t('resetConfig')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <SwitchField
            label={t('autoPlay')}
            description={t('autoPlayDesc')}
            checked={config.autoPlay}
            onCheckedChange={(v) => onUpdateConfig('autoPlay', v)}
          />

          <Field orientation="vertical">
            <FieldTitle>{t('playbackRate')}</FieldTitle>
            <div className="flex flex-wrap gap-1.5">
              {PLAYBACK_RATES.map((rate) => (
                <Button
                  key={rate}
                  variant={playbackRate === rate ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onRateChange(rate)}
                >
                  {rate}x
                </Button>
              ))}
            </div>
          </Field>

          {state.levels.length > 0 && (
            <Field orientation="vertical">
              <FieldTitle>{t('qualityLevel')}</FieldTitle>
              <FieldDescription>
                {t('qualityLevelDesc', { count: state.levels.length })}
              </FieldDescription>
              <Select
                value={String(state.currentLevel)}
                onValueChange={(val) => onSetLevel(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('auto')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">{t('auto')}</SelectItem>
                  {state.levels.map((level, i) => (
                    <SelectItem
                      key={`${level.height}-${level.bitrate}`}
                      value={String(i)}
                    >
                      {level.height}p - {formatBitrate(level.bitrate)}
                      {level.codec ? ` (${level.codec})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

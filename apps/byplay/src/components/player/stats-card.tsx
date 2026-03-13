'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field, FieldGroup, FieldTitle } from '@cdlab996/ui/components/field'
import { useTranslations } from 'next-intl'
import type { HlsPlayerState } from '@/hooks/use-hls-player'
import { formatBitrate, formatTime } from './shared-fields'

interface StatsCardProps {
  state: HlsPlayerState
}

export function StatsCard({ state }: StatsCardProps) {
  const t = useTranslations('stats')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-3">
          <Field orientation="horizontal">
            <FieldTitle>{t('status')}</FieldTitle>
            <Badge variant={state.isPlaying ? 'default' : 'secondary'}>
              {state.isPlaying ? t('playing') : t('paused')}
            </Badge>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('hlsjs')}</FieldTitle>
            <Badge variant={state.isSupported ? 'default' : 'destructive'}>
              {state.isSupported ? t('supported') : t('notSupported')}
            </Badge>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('time')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('buffered')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {formatTime(state.buffered)}
            </span>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('bandwidth')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {state.bandwidth > 0 ? formatBitrate(state.bandwidth) : '--'}
            </span>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('droppedFrames')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {state.droppedFrames}
            </span>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('levels')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {state.levels.length}
            </span>
          </Field>
          <Field orientation="horizontal">
            <FieldTitle>{t('currentLevel')}</FieldTitle>
            <span className="text-sm tabular-nums">
              {state.currentLevel === -1 ? 'Auto' : state.currentLevel}
            </span>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

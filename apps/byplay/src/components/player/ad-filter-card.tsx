'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@cdlab/ui/components/field'
import { Textarea } from '@cdlab/ui/components/textarea'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import type { AdFilterMode, HlsConfig } from '@/hooks/use-hls-player'

interface AdFilterCardProps {
  config: HlsConfig
  onUpdateConfig: <K extends keyof HlsConfig>(
    key: K,
    value: HlsConfig[K],
  ) => void
}

const MODES: AdFilterMode[] = ['off', 'keyword', 'heuristic', 'aggressive']

export function AdFilterCard({ config, onUpdateConfig }: AdFilterCardProps) {
  const t = useTranslations('adFilter')

  const handleKeywordsChange = useCallback(
    (value: string) => {
      const keywords = value
        .split(/\r?\n/)
        .map((k) => k.trim())
        .filter(Boolean)
      onUpdateConfig('adKeywords', keywords)
    },
    [onUpdateConfig],
  )

  const modeLabel = (mode: AdFilterMode) => {
    switch (mode) {
      case 'off':
        return t('modeOff')
      case 'keyword':
        return t('modeKeyword')
      case 'heuristic':
        return t('modeHeuristic')
      case 'aggressive':
        return t('modeAggressive')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="vertical">
            <FieldTitle>{t('mode')}</FieldTitle>
            <FieldDescription>{t('modeDesc')}</FieldDescription>
            <div className="flex flex-wrap gap-2">
              {MODES.map((mode) => (
                <Button
                  key={mode}
                  variant={config.adFilterMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdateConfig('adFilterMode', mode)}
                >
                  {modeLabel(mode)}
                </Button>
              ))}
            </div>
          </Field>
          <Field orientation="vertical">
            <FieldTitle>{t('keywords')}</FieldTitle>
            <FieldDescription>{t('keywordsDesc')}</FieldDescription>
            <Textarea
              value={config.adKeywords.join('\n')}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder={t('keywordsPlaceholder')}
              rows={4}
              className="font-mono text-sm"
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

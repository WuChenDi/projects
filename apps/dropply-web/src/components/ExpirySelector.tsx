'use client'

import { Field } from '@cdlab996/ui/components/field'
import { Label } from '@cdlab996/ui/components/label'
import { Slider } from '@cdlab996/ui/components/slider'
import { useTranslations } from 'next-intl'

interface ExpirySelectorProps {
  value: number
  onChange: (days: number) => void
}

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  const t = useTranslations('expiry')

  const formatLabel = (days: number) => {
    if (days === 1) return t('1day')
    if (days < 7) return t('days', { n: days })
    if (days === 7) return t('1week')
    if (days < 30) return t('days', { n: days })
    if (days === 30) return t('1month')
    if (days < 365) return t('days', { n: days })
    return t('1year')
  }

  return (
    <Field>
      <div className="flex items-center justify-between">
        <Label>{t('title')}</Label>
        <span className="text-xs font-medium text-primary">
          {formatLabel(value)}
        </span>
      </div>
      <Slider
        min={1}
        max={30}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </Field>
  )
}

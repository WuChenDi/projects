'use client'

import { Field } from '@cdlab/ui/components/field'
import { Label } from '@cdlab/ui/components/label'
import { Slider } from '@cdlab/ui/components/slider'
import { useTranslations } from 'next-intl'

// Non-linear steps for better UX: 1-7 daily, then 14, 30, 90, 180, 365
const EXPIRY_STEPS = [1, 2, 3, 4, 5, 6, 7, 14, 30, 90, 180, 365]

interface ExpirySelectorProps {
  value: number
  onChange: (days: number) => void
}

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  const t = useTranslations('expiry')

  const formatLabel = (days: number) => {
    if (days === 1) return t('1day')
    if (days === 7) return t('1week')
    if (days === 30) return t('1month')
    if (days === 365) return t('1year')
    return t('days', { n: days })
  }

  // Map slider index to days and vice versa
  const sliderIndex = EXPIRY_STEPS.indexOf(value)
  const currentIndex = sliderIndex >= 0 ? sliderIndex : 0

  return (
    <Field>
      <div className="flex items-center justify-between">
        <Label>{t('title')}</Label>
        <span className="text-xs font-medium text-primary">
          {formatLabel(value)}
        </span>
      </div>
      <Slider
        min={0}
        max={EXPIRY_STEPS.length - 1}
        step={1}
        value={[currentIndex]}
        onValueChange={([v]) => onChange(EXPIRY_STEPS[v])}
      />
    </Field>
  )
}

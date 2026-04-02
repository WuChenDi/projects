'use client'

import { Field } from '@cdlab996/ui/components/field'
import { Label } from '@cdlab996/ui/components/label'
import { Slider } from '@cdlab996/ui/components/slider'

interface ExpirySelectorProps {
  value: number
  onChange: (days: number) => void
}

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  const formatLabel = (days: number) => {
    if (days === 1) return '1 day'
    if (days < 7) return `${days} days`
    if (days === 7) return '1 week'
    if (days < 30) return `${days} days`
    if (days === 30) return '1 month'
    if (days < 365) return `${days} days`
    return '1 year'
  }

  return (
    <Field>
      <div className="flex items-center justify-between">
        <Label>Expiry Time</Label>
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

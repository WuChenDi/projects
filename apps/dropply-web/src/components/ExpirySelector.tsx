'use client'

import { Field } from '@cdlab996/ui/components/field'
import { Label } from '@cdlab996/ui/components/label'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cdlab996/ui/components/toggle-group'
import { cn } from '@cdlab996/ui/lib/utils'
import type { ValidityDays } from '@/types'

interface ExpirySelectorProps {
  value: ValidityDays
  onChange: (days: ValidityDays) => void
}

const expiryOptions = [
  {
    value: 1 as ValidityDays,
    label: '1 Day',
    description: 'Expires tomorrow',
  },
  {
    value: 3 as ValidityDays,
    label: '3 Days',
    description: 'Expires in 3 days',
  },
  {
    value: 7 as ValidityDays,
    label: '1 Week',
    description: 'Expires in 1 week',
  },
  {
    value: 15 as ValidityDays,
    label: '2 Weeks',
    description: 'Expires in 2 weeks',
  },
  {
    value: -1 as ValidityDays,
    label: 'Permanent',
    description: 'Never expires',
  },
]

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  return (
    <Field>
      <Label>Expiry Time</Label>
      <ToggleGroup
        type="single"
        value={String(value)}
        onValueChange={(val) => {
          if (val) onChange(Number(val) as ValidityDays)
        }}
        spacing={2}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full items-stretch"
      >
        {expiryOptions.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={String(option.value)}
            className={cn(
              'group flex flex-col items-center justify-start gap-1.5',
              'h-auto min-h-[4rem] py-3 px-2 rounded-xl border w-full',
              'transition-all duration-200 ease-out',
              'data-[state=off]:border-border data-[state=off]:bg-muted/40',
              'data-[state=off]:hover:border-primary/50 data-[state=off]:hover:bg-muted/70',
              'data-[state=on]:border-primary data-[state=on]:bg-primary/10',
              'data-[state=on]:-translate-y-0.5 hover:-translate-y-0.5',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-bold tracking-wide leading-none',
                'group-data-[state=on]:text-primary',
              )}
            >
              {option.label}
            </span>
            <span
              className={cn(
                'text-[10px] leading-tight text-muted-foreground text-center',
                'w-full whitespace-normal break-words',
                'group-data-[state=on]:text-primary/70',
              )}
            >
              {option.description}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  )
}

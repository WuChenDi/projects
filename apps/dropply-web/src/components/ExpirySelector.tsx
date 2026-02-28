'use client'

import { Label } from '@cdlab996/ui/components/label'
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
    <div className="space-y-4">
      <Label className="text-sm font-medium">Expiry Time</Label>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {expiryOptions.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'p-3 rounded-lg border text-center transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/30 bg-background/50 backdrop-blur-sm hover:border-primary/50 hover:bg-background/70',
              )}
            >
              <div className="font-medium text-sm mb-1">{option.label}</div>
              <div
                className={cn(
                  'text-xs',
                  isSelected
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground',
                )}
              >
                {option.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

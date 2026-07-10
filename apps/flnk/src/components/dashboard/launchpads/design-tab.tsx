'use client'

import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cdlab/ui/components/toggle-group'
import { cn } from '@cdlab/ui/lib/utils'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LaunchpadConfig } from '@/database/schema'

// Theme presets — each stamps a `preset` name (carried as `data-preset` on the
// public page) and a recommended primary color. Color stays independently
// editable below.
const PRESETS: { id: string; color: string }[] = [
  { id: 'default', color: '#000000' },
  { id: 'midnight', color: '#4f46e5' },
  { id: 'sunset', color: '#ea580c' },
  { id: 'forest', color: '#15803d' },
  { id: 'rose', color: '#e11d48' },
  { id: 'ocean', color: '#0891b2' },
]

// Curated color swatches for quick primary-color selection.
const SWATCHES = [
  '#000000',
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#15803d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#e11d48',
  '#9333ea',
]

const SHAPES = ['rounded', 'pill', 'square'] as const

interface DesignTabProps {
  config: LaunchpadConfig
  onChange: (config: LaunchpadConfig) => void
}

export function DesignTab({ config, onChange }: DesignTabProps) {
  const t = useTranslations('launchpads')
  const { theme } = config

  function setTheme(patch: Partial<LaunchpadConfig['theme']>) {
    onChange({ ...config, theme: { ...theme, ...patch } })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <Label>{t('design.preset')}</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                setTheme({ preset: preset.id, primaryColor: preset.color })
              }
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors hover:border-primary/60',
                theme.preset === preset.id &&
                  'border-primary ring-1 ring-primary/30',
              )}
            >
              <span
                className="size-6 rounded-full"
                style={{ backgroundColor: preset.color }}
              />
              {t(`design.presets.${preset.id}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2.5">
        <Label>{t('design.primaryColor')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => setTheme({ primaryColor: color })}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border transition-transform hover:scale-110',
                theme.primaryColor.toLowerCase() === color &&
                  'ring-2 ring-ring ring-offset-2',
              )}
              style={{ backgroundColor: color }}
            >
              {theme.primaryColor.toLowerCase() === color && (
                <Check className="size-3.5 text-white" />
              )}
            </button>
          ))}
          <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border">
            <span
              className="block size-full"
              style={{ backgroundColor: theme.primaryColor }}
            />
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ primaryColor: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={t('design.customColor')}
            />
          </label>
          <Input
            value={theme.primaryColor}
            maxLength={7}
            className="h-7 w-24 font-mono text-xs"
            onChange={(e) => setTheme({ primaryColor: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <Label>{t('design.buttonShape')}</Label>
        <ToggleGroup
          type="single"
          value={theme.buttonShape}
          onValueChange={(v) =>
            v && setTheme({ buttonShape: v as typeof theme.buttonShape })
          }
          variant="outline"
        >
          {SHAPES.map((shape) => (
            <ToggleGroupItem key={shape} value={shape} className="px-4">
              {t(`design.shapes.${shape}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>
    </div>
  )
}

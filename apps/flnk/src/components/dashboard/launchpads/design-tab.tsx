'use client'

import { Button } from '@cdlab/ui/components/button'
import { Card } from '@cdlab/ui/components/card'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import { Textarea } from '@cdlab/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@cdlab/ui/components/toggle-group'
import { cn } from '@cdlab/ui/lib/utils'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ImageIcon,
  MousePointerClick,
  Palette,
  User,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LaunchpadConfig } from '@/database/schema'

type Theme = LaunchpadConfig['theme']
type Background = NonNullable<Theme['background']>

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u
const safeHex = (v: string, fallback = '#000000') =>
  HEX_RE.test(v) ? v : fallback

// Theme presets — each seeds a coordinated primary color + page background so a
// single click yields a finished look. Colors stay independently editable below.
const PRESETS: { id: string; color: string; background: Background }[] = [
  {
    id: 'default',
    color: '#4f46e5',
    background: { type: 'gradient', from: '#eef2ff', to: '#faf5ff', dir: 'b' },
  },
  {
    id: 'midnight',
    color: '#818cf8',
    background: { type: 'gradient', from: '#0f172a', to: '#1e1b4b', dir: 'b' },
  },
  {
    id: 'sunset',
    color: '#ea580c',
    background: { type: 'gradient', from: '#fff7ed', to: '#ffe4c4', dir: 'b' },
  },
  {
    id: 'forest',
    color: '#15803d',
    background: { type: 'gradient', from: '#f0fdf4', to: '#dcfce7', dir: 'b' },
  },
  {
    id: 'rose',
    color: '#e11d48',
    background: { type: 'gradient', from: '#fff1f2', to: '#ffe4e6', dir: 'b' },
  },
  {
    id: 'ocean',
    color: '#0891b2',
    background: { type: 'gradient', from: '#ecfeff', to: '#cffafe', dir: 'b' },
  },
]

// Curated color swatches for quick primary-color selection.
const SWATCHES = [
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#15803d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#e11d48',
  '#9333ea',
  '#000000',
]

const SHAPES = ['rounded', 'pill', 'square'] as const
const FILLS = ['solid', 'outline', 'soft'] as const
const SHADOWS = ['none', 'soft'] as const
const DIRECTIONS: { id: Background['dir']; icon: typeof ArrowDown }[] = [
  { id: 'b', icon: ArrowDown },
  { id: 'r', icon: ArrowRight },
  { id: 'br', icon: ArrowDownRight },
  { id: 'tr', icon: ArrowUpRight },
]

interface DesignTabProps {
  config: LaunchpadConfig
  onChange: (config: LaunchpadConfig) => void
}

// Preview a preset/background swatch as the actual gradient it produces.
function bgPreview(bg: Background): string {
  const from = safeHex(bg.from, '#ffffff')
  if (bg.type === 'gradient' && bg.to) {
    const to = safeHex(bg.to, from)
    const dir = { b: '180deg', r: '90deg', br: '135deg', tr: '45deg' }[
      bg.dir ?? 'b'
    ]
    return `linear-gradient(${dir}, ${from}, ${to})`
  }
  return from
}

export function DesignTab({ config, onChange }: DesignTabProps) {
  const t = useTranslations('launchpads')
  const { theme, profile } = config

  function setTheme(patch: Partial<Theme>) {
    onChange({ ...config, theme: { ...theme, ...patch } })
  }
  function setProfile(patch: Partial<LaunchpadConfig['profile']>) {
    onChange({ ...config, profile: { ...profile, ...patch } })
  }

  const fill = theme.buttonFill ?? 'solid'
  const shadow = theme.buttonShadow ?? 'none'
  const bg: Background = theme.background ?? { type: 'solid', from: '#ffffff' }
  function setBackground(patch: Partial<Background>) {
    setTheme({ background: { ...bg, ...patch } })
  }

  return (
    <div className="space-y-4">
      {/* ── Profile ──────────────────────────────────────────────── */}
      <Section icon={User} title={t('design.profile.title')}>
        <div className="flex items-start gap-3">
          {profile.avatar ? (
            // biome-ignore lint/performance/noImgElement: tiny inline preview of a user-supplied remote URL
            <img
              src={profile.avatar}
              alt=""
              className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-xs">{t('design.profile.avatar')}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={profile.avatar ?? ''}
                maxLength={2048}
                placeholder="https://…"
                onChange={(e) => setProfile({ avatar: e.target.value })}
              />
              {profile.avatar && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('design.profile.remove')}
                  onClick={() => setProfile({ avatar: '' })}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Field
          label={t('design.profile.name')}
          count={profile.name?.length ?? 0}
          max={128}
        >
          <Input
            value={profile.name ?? ''}
            maxLength={128}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
        </Field>

        <Field
          label={t('design.profile.bio')}
          count={profile.bio?.length ?? 0}
          max={512}
        >
          <Textarea
            value={profile.bio ?? ''}
            maxLength={512}
            rows={2}
            onChange={(e) => setProfile({ bio: e.target.value })}
          />
        </Field>
      </Section>

      {/* ── Theme presets ────────────────────────────────────────── */}
      <Section icon={Palette} title={t('design.sections.theme')}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                setTheme({
                  preset: preset.id,
                  primaryColor: preset.color,
                  background: preset.background,
                })
              }
              className={cn(
                'group flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-all hover:border-primary/60 hover:shadow-sm',
                theme.preset === preset.id &&
                  'border-primary ring-1 ring-primary/30',
              )}
            >
              <span
                className="relative h-10 w-full overflow-hidden rounded-md ring-1 ring-black/5"
                style={{ background: bgPreview(preset.background) }}
              >
                <span
                  className="absolute bottom-1 left-1/2 h-3 w-8 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
              </span>
              {t(`design.presets.${preset.id}`)}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Background ───────────────────────────────────────────── */}
      <Section icon={ImageIcon} title={t('design.background.title')}>
        <ToggleGroup
          type="single"
          value={bg.type}
          onValueChange={(v) =>
            v &&
            setBackground(
              v === 'gradient'
                ? { type: 'gradient', to: bg.to ?? '#e0e7ff' }
                : { type: 'solid' },
            )
          }
          variant="outline"
        >
          <ToggleGroupItem value="solid" className="px-4">
            {t('design.background.solid')}
          </ToggleGroupItem>
          <ToggleGroupItem value="gradient" className="px-4">
            {t('design.background.gradient')}
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {bg.type === 'gradient'
                ? t('design.background.from')
                : t('design.background.color')}
            </Label>
            <ColorInput
              value={bg.from}
              onChange={(from) => setBackground({ from })}
            />
          </div>
          {bg.type === 'gradient' && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.background.to')}</Label>
              <ColorInput
                value={bg.to ?? '#e0e7ff'}
                onChange={(to) => setBackground({ to })}
              />
            </div>
          )}
          {bg.type === 'gradient' && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t('design.background.direction')}
              </Label>
              <div className="flex gap-1.5">
                {DIRECTIONS.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={id}
                    onClick={() => setBackground({ dir: id })}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md border transition-colors hover:border-primary/60',
                      (bg.dir ?? 'b') === id &&
                        'border-primary ring-1 ring-primary/30',
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <span
            className="ml-auto h-10 w-16 shrink-0 rounded-md ring-1 ring-border"
            style={{ background: bgPreview(bg) }}
          />
        </div>
      </Section>

      {/* ── Buttons ──────────────────────────────────────────────── */}
      <Section icon={MousePointerClick} title={t('design.buttons.title')}>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('design.primaryColor')}</Label>
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
            <ColorInput
              value={theme.primaryColor}
              onChange={(primaryColor) => setTheme({ primaryColor })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('design.fill.label')}</Label>
          <ToggleGroup
            type="single"
            value={fill}
            onValueChange={(v) =>
              v && setTheme({ buttonFill: v as Theme['buttonFill'] })
            }
            variant="outline"
          >
            {FILLS.map((f) => (
              <ToggleGroupItem key={f} value={f} className="px-4">
                {t(`design.fill.${f}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('design.buttonShape')}</Label>
            <ToggleGroup
              type="single"
              value={theme.buttonShape}
              onValueChange={(v) =>
                v && setTheme({ buttonShape: v as Theme['buttonShape'] })
              }
              variant="outline"
            >
              {SHAPES.map((shape) => (
                <ToggleGroupItem key={shape} value={shape} className="px-4">
                  {t(`design.shapes.${shape}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('design.shadow.label')}</Label>
            <ToggleGroup
              type="single"
              value={shadow}
              onValueChange={(v) =>
                v && setTheme({ buttonShadow: v as Theme['buttonShadow'] })
              }
              variant="outline"
            >
              {SHADOWS.map((s) => (
                <ToggleGroupItem key={s} value={s} className="px-4">
                  {t(`design.shadow.${s}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

function Field({
  label,
  count,
  max,
  children,
}: {
  label: string
  count?: number
  max?: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {typeof count === 'number' && typeof max === 'number' && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {count}/{max}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// Color picker swatch + hex text input, kept in sync. The native picker needs a
// full 7-char hex, so it falls back while the text field is mid-edit.
function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border">
        <span
          className="block size-full"
          style={{ backgroundColor: safeHex(value, '#ffffff') }}
        />
        <input
          type="color"
          value={safeHex(value, '#000000')}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={value}
        />
      </label>
      <Input
        value={value}
        maxLength={7}
        className="h-8 w-24 font-mono text-xs"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

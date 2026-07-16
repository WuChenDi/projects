'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { Input } from '@cdlab/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cdlab/ui/components/input-group'
import { Label } from '@cdlab/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab/ui/components/select'
import { Slider } from '@cdlab/ui/components/slider'
import { Switch } from '@cdlab/ui/components/switch'
import { Textarea } from '@cdlab/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@cdlab/ui/components/toggle-group'
import { cn } from '@cdlab/ui/lib/utils'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronUp,
  GripVertical,
  ImageIcon,
  LayoutPanelTop,
  LayoutTemplate,
  MousePointerClick,
  Palette,
  PanelTop,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Type,
  User,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
  SOCIAL_MAP,
  SOCIAL_PLATFORMS,
} from '@/components/launchpad/social-icons'
import type { LaunchpadConfig } from '@/database/schema'

// Platforms shown in the Socials picker before "View more" is expanded.
const SOCIAL_PICKER_PREVIEW = 5

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
    background: { type: 'gradient', from: '#e0e7ff', to: '#a5b4fc', dir: 'b' },
  },
  {
    id: 'midnight',
    color: '#a5b4fc',
    background: { type: 'gradient', from: '#312e81', to: '#0f172a', dir: 'b' },
  },
  {
    id: 'sunset',
    color: '#c2410c',
    background: { type: 'gradient', from: '#ffedd5', to: '#fdba74', dir: 'b' },
  },
  {
    id: 'forest',
    color: '#15803d',
    background: { type: 'gradient', from: '#dcfce7', to: '#86efac', dir: 'b' },
  },
  {
    id: 'rose',
    color: '#be123c',
    background: { type: 'gradient', from: '#ffe4e6', to: '#fda4af', dir: 'b' },
  },
  {
    id: 'ocean',
    color: '#0e7490',
    background: { type: 'gradient', from: '#cffafe', to: '#67e8f9', dir: 'b' },
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
const SHADOWS = ['none', 'soft', 'hard'] as const
const FONTS = ['sans', 'serif', 'mono', 'rounded'] as const

// Border radius + shadow used to preview each block shape/shadow in its picker.
const SHAPE_RADIUS: Record<(typeof SHAPES)[number], string> = {
  rounded: '0.5rem',
  pill: '9999px',
  square: '0px',
}
const SHADOW_PREVIEW: Record<(typeof SHADOWS)[number], string> = {
  none: 'none',
  soft: '0 6px 14px -4px rgba(0, 0, 0, 0.3)',
  hard: '3px 3px 0 0 rgba(0, 0, 0, 0.6)',
}
const BG_TYPES = ['solid', 'gradient', 'image'] as const
const LAYOUTS = [
  'classic',
  'left',
  'hero',
  'banner',
  'cover',
  'compact',
] as const
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
  const [showAllSocials, setShowAllSocials] = useState(false)
  // Drag state for the reorderable socials list.
  const [socialDrag, setSocialDrag] = useState<number | null>(null)

  function setTheme(patch: Partial<Theme>) {
    onChange({ ...config, theme: { ...theme, ...patch } })
  }
  function setProfile(patch: Partial<LaunchpadConfig['profile']>) {
    onChange({ ...config, profile: { ...profile, ...patch } })
  }

  const fill = theme.buttonFill ?? 'solid'
  const shadow = theme.buttonShadow ?? 'none'
  const font = theme.font ?? 'sans'
  const bg: Background = theme.background ?? { type: 'solid', from: '#ffffff' }
  function setBackground(patch: Partial<Background>) {
    setTheme({ background: { ...bg, ...patch } })
  }
  const layout = theme.layout ?? 'classic'
  const header: Background = theme.header ?? { type: 'solid', from: '#385189' }
  function setHeader(patch: Partial<Background>) {
    setTheme({ header: { ...header, ...patch } })
  }

  // Text-color overrides — an empty value clears back to auto-contrast (no
  // `delete`, per lint) by rebuilding the object without that key.
  function setTitleColor(v?: string) {
    const { title: _t, ...rest } = theme.textColor ?? {}
    setTheme({ textColor: v ? { ...rest, title: v } : rest })
  }
  function setBodyColor(v?: string) {
    const { body: _b, ...rest } = theme.textColor ?? {}
    setTheme({ textColor: v ? { ...rest, body: v } : rest })
  }
  function setButtonTextColor(v?: string) {
    setTheme({ buttonTextColor: v })
  }

  const socials = config.socials ?? {
    items: [],
    iconColor: 'brand' as const,
    placement: 'top' as const,
  }
  function setSocials(patch: Partial<NonNullable<LaunchpadConfig['socials']>>) {
    onChange({ ...config, socials: { ...socials, ...patch } })
  }
  function addSocial(platform: string) {
    setSocials({ items: [...socials.items, { platform, url: '' }] })
  }
  function updateSocial(index: number, url: string) {
    setSocials({
      items: socials.items.map((it, i) => (i === index ? { ...it, url } : it)),
    })
  }
  // Normalize a social destination on blur: the Email row accepts a bare address
  // (e.g. `me@example.com`), which fails the http(s)/mailto schema unless we add
  // the `mailto:` scheme — otherwise the link silently can't be saved.
  function normalizeSocial(index: number) {
    const item = socials.items[index]
    if (!item) return
    const v = item.url.trim()
    if (
      item.platform === 'gmail' &&
      v &&
      v.includes('@') &&
      !/^(?:https?:\/\/|mailto:)/iu.test(v)
    ) {
      updateSocial(index, `mailto:${v}`)
    } else if (v !== item.url) {
      updateSocial(index, v)
    }
  }
  function removeSocial(index: number) {
    setSocials({ items: socials.items.filter((_, i) => i !== index) })
  }
  function moveSocial(from: number, to: number) {
    if (to < 0 || to >= socials.items.length) return
    const next = [...socials.items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    setSocials({ items: next })
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
            <InputGroup>
              <InputGroupInput
                value={profile.avatar ?? ''}
                maxLength={2048}
                placeholder="https://…"
                onChange={(e) => setProfile({ avatar: e.target.value })}
              />
              {profile.avatar && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t('design.profile.remove')}
                    onClick={() => setProfile({ avatar: '' })}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
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

      {/* ── Page ─────────────────────────────────────────────────── */}
      <Section icon={LayoutPanelTop} title={t('design.sections.page')}>
        <div className="space-y-6 [&>section+section]:border-t [&>section+section]:border-border [&>section+section]:pt-6">
          <SubSection icon={Palette} title={t('design.sections.theme')}>
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
          </SubSection>

          <SubSection icon={LayoutTemplate} title={t('design.layout.title')}>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map((lay) => (
                <button
                  key={lay}
                  type="button"
                  onClick={() => setTheme({ layout: lay })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-all hover:border-primary/60',
                    layout === lay && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  <LayoutThumb variant={lay} />
                  {t(`design.layout.variants.${lay}`)}
                </button>
              ))}
            </div>
          </SubSection>

          {/* Header band only applies to the hero / banner layouts. */}
          {(layout === 'hero' || layout === 'banner') && (
            <SubSection
              icon={PanelTop}
              title={t('design.header.title')}
              action={<SurfaceTypeToggle value={header} onChange={setHeader} />}
            >
              <p className="text-xs text-muted-foreground">
                {t('design.header.hint')}
              </p>
              <SurfaceEditor value={header} onChange={setHeader} />
            </SubSection>
          )}

          <SubSection
            icon={ImageIcon}
            title={t('design.background.title')}
            action={<SurfaceTypeToggle value={bg} onChange={setBackground} />}
          >
            <SurfaceEditor value={bg} onChange={setBackground} />
          </SubSection>

          <SubSection icon={Type} title={t('design.typography.title')}>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.typography.font')}</Label>
              <Select
                value={font}
                onValueChange={(v) => setTheme({ font: v as Theme['font'] })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {t(`design.typography.fonts.${f}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t('design.typography.titleColor')}
                </Label>
                <OptionalColor
                  value={theme.textColor?.title}
                  onChange={setTitleColor}
                  autoLabel={t('design.typography.auto')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t('design.typography.bodyColor')}
                </Label>
                <OptionalColor
                  value={theme.textColor?.body}
                  onChange={setBodyColor}
                  autoLabel={t('design.typography.auto')}
                />
              </div>
            </div>
          </SubSection>

          <SubSection icon={MousePointerClick} title={t('design.blocks.title')}>
            {/* Shape + fill previewed as the block outline itself. */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.buttonShape')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((s) => (
                  <PickButton
                    key={s}
                    active={theme.buttonShape === s}
                    ariaLabel={t(`design.shapes.${s}`)}
                    onClick={() => setTheme({ buttonShape: s })}
                  >
                    <span
                      className="h-5 w-full bg-muted-foreground/30"
                      style={{ borderRadius: SHAPE_RADIUS[s] }}
                    />
                  </PickButton>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.fill.label')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {FILLS.map((f) => (
                  <PickButton
                    key={f}
                    active={fill === f}
                    ariaLabel={t(`design.fill.${f}`)}
                    onClick={() => setTheme({ buttonFill: f })}
                  >
                    <span
                      className={cn(
                        'h-5 w-full rounded-md',
                        f === 'solid' && 'bg-muted-foreground/40',
                        f === 'outline' &&
                          'border-2 border-muted-foreground/40',
                        f === 'soft' && 'bg-muted-foreground/15',
                      )}
                    />
                  </PickButton>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.shadow.label')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {SHADOWS.map((s) => (
                  <PickButton
                    key={s}
                    active={shadow === s}
                    ariaLabel={t(`design.shadow.${s}`)}
                    onClick={() => setTheme({ buttonShadow: s })}
                  >
                    <span
                      className="h-5 w-full rounded-md bg-card ring-1 ring-border"
                      style={{ boxShadow: SHADOW_PREVIEW[s] }}
                    />
                  </PickButton>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t('design.blocks.blockColor')}
                </Label>
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
                <Label className="text-xs">
                  {t('design.blocks.blockText')}
                </Label>
                <OptionalColor
                  value={theme.buttonTextColor}
                  onChange={setButtonTextColor}
                  autoLabel={t('design.typography.auto')}
                />
              </div>
            </div>
          </SubSection>
        </div>
      </Section>

      {/* ── Socials (page-level bar) ─────────────────────────────── */}
      <Section icon={Share2} title={t('design.socials.title')}>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('design.socials.pick')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {(showAllSocials
              ? SOCIAL_PLATFORMS
              : SOCIAL_PLATFORMS.slice(0, SOCIAL_PICKER_PREVIEW)
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addSocial(p.id)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/60"
              >
                <p.Icon className="size-3.5" style={{ color: p.color }} />
                {p.label}
              </button>
            ))}
            {SOCIAL_PLATFORMS.length > SOCIAL_PICKER_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllSocials((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/60"
              >
                {showAllSocials ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    {t('design.socials.viewFewer')}
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    {t('design.socials.viewMore')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {socials.items.length > 0 && (
          <div className="space-y-2">
            {socials.items.map((item, i) => {
              const p = SOCIAL_MAP[item.platform]
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, platforms may repeat
                  key={i}
                  draggable
                  onDragStart={() => setSocialDrag(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (socialDrag !== null) moveSocial(socialDrag, i)
                    setSocialDrag(null)
                  }}
                  onDragEnd={() => setSocialDrag(null)}
                  className={cn(
                    'flex items-center gap-2',
                    socialDrag === i && 'opacity-50',
                  )}
                >
                  <GripVertical
                    className="size-4 shrink-0 cursor-grab text-muted-foreground"
                    aria-label={t('design.socials.reorder')}
                  />
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border"
                    style={{ color: p?.color }}
                  >
                    {p ? (
                      <p.Icon className="size-4" />
                    ) : (
                      <Share2 className="size-4" />
                    )}
                  </span>
                  <InputGroup className="flex-1">
                    <InputGroupInput
                      value={item.url}
                      placeholder={t('design.socials.urlPlaceholder')}
                      maxLength={2048}
                      onChange={(e) => updateSocial(i, e.target.value)}
                      onBlur={() => normalizeSocial(i)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        aria-label={t('design.socials.remove')}
                        onClick={() => removeSocial(i)}
                      >
                        <Trash2 className="text-destructive" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              )
            })}
          </div>
        )}

        {socials.items.length > 0 && (
          <div className="flex flex-wrap gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.socials.iconColor')}</Label>
              <ToggleGroup
                type="single"
                value={socials.iconColor ?? 'brand'}
                onValueChange={(v) =>
                  v && setSocials({ iconColor: v as 'brand' | 'mono' })
                }
                variant="outline"
              >
                <ToggleGroupItem value="brand" className="px-4">
                  {t('design.socials.brand')}
                </ToggleGroupItem>
                <ToggleGroupItem value="mono" className="px-4">
                  {t('design.socials.mono')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('design.socials.placement')}</Label>
              <ToggleGroup
                type="single"
                value={socials.placement ?? 'top'}
                onValueChange={(v) =>
                  v && setSocials({ placement: v as 'top' | 'bottom' })
                }
                variant="outline"
              >
                <ToggleGroupItem value="top" className="px-4">
                  {t('design.socials.top')}
                </ToggleGroupItem>
                <ToggleGroupItem value="bottom" className="px-4">
                  {t('design.socials.bottom')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}
      </Section>

      {/* ── Branding ─────────────────────────────────────────────── */}
      <Section icon={Sparkles} title={t('design.branding.title')}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-sm">{t('design.branding.showLogo')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('design.branding.hint')}
            </p>
          </div>
          <Switch
            checked={!config.hideBranding}
            onCheckedChange={(v) => onChange({ ...config, hideBranding: !v })}
          />
        </div>
      </Section>
    </div>
  )
}

function SubSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof User
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">{title}</h4>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}

// A selectable preview tile used by the block shape / fill / shadow pickers.
function PickButton({
  active,
  ariaLabel,
  onClick,
  children,
}: {
  active: boolean
  ariaLabel: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-lg border p-3 transition-all hover:border-primary/60',
        active && 'border-primary ring-1 ring-primary/30',
      )}
    >
      {children}
    </button>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
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

// The solid / gradient / image selector — rendered in the section title row.
function SurfaceTypeToggle({
  value,
  onChange,
}: {
  value: Background
  onChange: (patch: Partial<Background>) => void
}) {
  const t = useTranslations('launchpads')
  return (
    <ToggleGroup
      type="single"
      value={value.type}
      onValueChange={(v) => {
        if (!v) return
        if (v === 'gradient')
          onChange({ type: 'gradient', to: value.to ?? '#e0e7ff' })
        else if (v === 'image') onChange({ type: 'image' })
        else onChange({ type: 'solid' })
      }}
      variant="outline"
    >
      {BG_TYPES.map((tp) => (
        <ToggleGroupItem key={tp} value={tp} className="px-3 text-xs">
          {t(`design.background.${tp}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// Shared body editor for a paintable surface (page background or header band):
// solid color, two-color gradient with a direction, or a cover image + overlay.
// The type selector lives in the section header (see `SurfaceTypeToggle`).
function SurfaceEditor({
  value,
  onChange,
}: {
  value: Background
  onChange: (patch: Partial<Background>) => void
}) {
  const t = useTranslations('launchpads')
  return value.type === 'image' ? (
    <div className="space-y-4">
      <Field label={t('design.background.imageUrl')}>
        <Input
          value={value.image ?? ''}
          maxLength={2048}
          placeholder="https://…"
          onChange={(e) => onChange({ image: e.target.value })}
        />
      </Field>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('design.background.overlay')}</Label>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {value.overlay ?? 40}%
          </span>
        </div>
        <Slider
          value={[value.overlay ?? 40]}
          min={0}
          max={100}
          step={5}
          onValueChange={(vals) => onChange({ overlay: vals[0] ?? 40 })}
        />
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs">
          {value.type === 'gradient'
            ? t('design.background.from')
            : t('design.background.color')}
        </Label>
        <ColorInput
          value={value.from}
          onChange={(from) => onChange({ from })}
        />
      </div>
      {value.type === 'gradient' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('design.background.to')}</Label>
          <ColorInput
            value={value.to ?? '#e0e7ff'}
            onChange={(to) => onChange({ to })}
          />
        </div>
      )}
      {value.type === 'gradient' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('design.background.direction')}</Label>
          <div className="flex gap-1.5">
            {DIRECTIONS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={id}
                onClick={() => onChange({ dir: id })}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md border transition-colors hover:border-primary/60',
                  (value.dir ?? 'b') === id &&
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
        style={{ background: bgPreview(value) }}
      />
    </div>
  )
}

// A miniature mock of each header layout — pure CSS bars, no real content.
function LayoutThumb({ variant }: { variant: (typeof LAYOUTS)[number] }) {
  if (variant === 'left') {
    return (
      <span className="flex h-14 w-full flex-col gap-1.5 rounded-md border bg-muted/40 p-2">
        <span className="flex items-center gap-1.5">
          <span className="size-3 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="h-1 w-8 rounded bg-muted-foreground/40" />
            <span className="h-1 w-5 rounded bg-muted-foreground/25" />
          </span>
        </span>
        <span className="h-2 w-full rounded bg-muted-foreground/15" />
        <span className="h-2 w-full rounded bg-muted-foreground/15" />
      </span>
    )
  }
  if (variant === 'hero') {
    return (
      <span className="flex h-14 w-full flex-col items-center overflow-hidden rounded-md border bg-muted/40">
        <span className="h-4 w-full bg-primary/40" />
        <span className="-mt-2 size-3 rounded-full bg-muted-foreground/50 ring-2 ring-background" />
        <span className="mt-0.5 h-1 w-8 rounded bg-muted-foreground/40" />
        <span className="mt-1 h-2 w-4/5 rounded bg-muted-foreground/15" />
      </span>
    )
  }
  if (variant === 'banner') {
    return (
      <span className="flex h-14 w-full flex-col overflow-hidden rounded-md border bg-muted/40">
        <span className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-primary/40">
          <span className="size-3 rounded-full bg-background/70" />
          <span className="h-1 w-8 rounded bg-background/70" />
        </span>
        <span className="flex flex-col gap-1 p-1.5">
          <span className="h-2 w-full rounded bg-muted-foreground/15" />
        </span>
      </span>
    )
  }
  if (variant === 'cover') {
    return (
      <span className="flex h-14 w-full flex-col items-center gap-1 rounded-md border bg-muted/40 p-2">
        <span className="size-6 rounded-md bg-muted-foreground/40" />
        <span className="h-1 w-8 rounded bg-muted-foreground/40" />
        <span className="mt-0.5 h-2 w-full rounded bg-muted-foreground/15" />
      </span>
    )
  }
  if (variant === 'compact') {
    return (
      <span className="flex h-14 w-full flex-col items-center gap-1 rounded-md border bg-muted/40 p-2">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          <span className="h-1 w-7 rounded bg-muted-foreground/40" />
        </span>
        <span className="mt-1 h-2 w-full rounded bg-muted-foreground/15" />
        <span className="h-2 w-full rounded bg-muted-foreground/15" />
      </span>
    )
  }
  return (
    <span className="flex h-14 w-full flex-col items-center gap-1 rounded-md border bg-muted/40 p-2">
      <span className="size-3 rounded-full bg-muted-foreground/40" />
      <span className="h-1 w-8 rounded bg-muted-foreground/40" />
      <span className="mt-1 h-2 w-full rounded bg-muted-foreground/15" />
      <span className="h-2 w-full rounded bg-muted-foreground/15" />
    </span>
  )
}

// A color override that can be cleared back to "auto" (auto-contrast). Unset →
// a button that seeds a starting color; set → a picker plus a reset control.
function OptionalColor({
  value,
  onChange,
  autoLabel,
}: {
  value?: string
  onChange: (value?: string) => void
  autoLabel: string
}) {
  if (!value) {
    return (
      <Button variant="outline" size="sm" onClick={() => onChange('#111111')}>
        {autoLabel}
      </Button>
    )
  }
  return (
    <ColorInput
      value={value}
      onChange={onChange}
      trailing={
        <InputGroupButton
          size="icon-xs"
          aria-label={autoLabel}
          onClick={() => onChange(undefined)}
        >
          <X />
        </InputGroupButton>
      }
    />
  )
}

// Color picker swatch + hex text input, kept in sync. The native picker needs a
// full 7-char hex, so it falls back while the text field is mid-edit.
function ColorInput({
  value,
  onChange,
  trailing,
}: {
  value: string
  onChange: (value: string) => void
  trailing?: React.ReactNode
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
      <InputGroup className="w-28">
        <InputGroupInput
          value={value}
          maxLength={7}
          className="font-mono text-xs"
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing && (
          <InputGroupAddon align="inline-end">{trailing}</InputGroupAddon>
        )}
      </InputGroup>
    </div>
  )
}

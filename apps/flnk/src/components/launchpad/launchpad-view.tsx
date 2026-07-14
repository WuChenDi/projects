import type { CSSProperties } from 'react'
import type { LaunchpadBlock, LaunchpadConfig } from '@/database/schema'

// Resolved short-link reference for button/shortlink blocks: the public route
// (`/<slug>`) the click flows through and a display label. The block stores only
// a link id; the server resolves it to this before rendering.
export interface LinkRef {
  slug: string
  label: string
}

export interface LaunchpadViewProps {
  config: LaunchpadConfig
  // linkId → reference. Missing ids (deleted links) are skipped at render.
  linkRefs: Record<string, LinkRef>
}

type Theme = LaunchpadConfig['theme']

const SHAPE_CLASS = {
  rounded: 'rounded-lg',
  pill: 'rounded-full',
  square: 'rounded-none',
} as const

const GRADIENT_DIR = {
  b: 'to bottom',
  r: 'to right',
  br: 'to bottom right',
  tr: 'to top right',
} as const

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u

// The editor's live preview can feed a half-typed hex here; fall back rather
// than render `NaN` colors. Saved configs are already validated by zod.
function safeHex(hex: string | undefined, fallback: string): string {
  return hex && HEX_RE.test(hex) ? hex : fallback
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.slice(1)
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Perceived-brightness contrast pick — dark ink on light fills, white on dark.
function readableInk(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0a0a0a' : '#ffffff'
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Resolve the page background to a CSS value + the ink color that reads on it.
// Returns null when no background is configured (legacy: inherit app surface).
function resolvePage(theme: Theme): { background: string; ink: string } | null {
  const bg = theme.background
  if (!bg) return null
  const from = safeHex(bg.from, '#ffffff')
  if (bg.type === 'gradient' && bg.to) {
    const to = safeHex(bg.to, from)
    const dir = GRADIENT_DIR[bg.dir ?? 'b']
    return {
      background: `linear-gradient(${dir}, ${from}, ${to})`,
      ink: readableInk(from),
    }
  }
  return { background: from, ink: readableInk(from) }
}

// Fill + elevation for a clickable block button, derived from the theme.
function buttonStyle(theme: Theme): CSSProperties {
  const primary = safeHex(theme.primaryColor, '#4f46e5')
  const fill = theme.buttonFill ?? 'solid'
  const shadow =
    theme.buttonShadow === 'soft'
      ? { boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.35)' }
      : {}
  switch (fill) {
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: primary,
        border: `2px solid ${primary}`,
        ...shadow,
      }
    case 'soft':
      return {
        backgroundColor: rgba(primary, 0.14),
        color: primary,
        border: `1px solid ${rgba(primary, 0.24)}`,
        ...shadow,
      }
    default: {
      // A faint ink-tinted edge keeps a near-black solid fill visible even on a
      // dark surface (the previous default-preset invisibility).
      const ink = readableInk(primary)
      return {
        backgroundColor: primary,
        color: ink,
        border: `1px solid ${rgba(ink, 0.16)}`,
        ...shadow,
      }
    }
  }
}

// Neutralize a foreign-scheme URL (`javascript:`, `data:`, …) before it reaches
// an `href`. Defense-in-depth: the schema already rejects non-http(s) on write,
// but legacy rows and the editor's unsaved live preview can still flow in here.
// Only for absolute external URLs — internal `/<slug>` hrefs are built directly.
function safeHref(url: string): string {
  return /^https?:\/\//iu.test(url) ? url : '#'
}

// Pure, isomorphic renderer for a launchpad's profile + blocks. Takes already
// resolved data (no DB / server-only imports) so the dashboard editor can reuse
// it for a live preview. Clicks are tracked by a delegated listener keyed on the
// `data-block-id` each clickable element carries — this component stays
// handler-free so it renders identically on the server and in the editor.
export function LaunchpadView({ config, linkRefs }: LaunchpadViewProps) {
  const { profile, theme, blocks } = config
  const shape = SHAPE_CLASS[theme.buttonShape]
  const page = resolvePage(theme)
  // With a custom background we drive text color inline; secondary text fades
  // the inherited ink. Without one we keep the app theme's semantic tokens.
  const mainStyle: CSSProperties | undefined = page
    ? { background: page.background, color: page.ink }
    : undefined
  const mutedClass = page ? 'opacity-70' : 'text-muted-foreground'
  const btnStyle = buttonStyle(theme)

  return (
    <main
      data-preset={theme.preset}
      style={mainStyle}
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-4 px-5 py-12"
    >
      {(profile.avatar || profile.name || profile.bio) && (
        <header className="flex flex-col items-center gap-2 text-center">
          {profile.avatar && (
            // biome-ignore lint/performance/noImgElement: public render is plain HTML, no next/image
            <img
              src={profile.avatar}
              alt={profile.name ?? ''}
              className="size-20 rounded-full object-cover ring-2 ring-black/5 ring-offset-2 ring-offset-transparent"
            />
          )}
          {profile.name && (
            <h1 className="text-xl font-semibold">{profile.name}</h1>
          )}
          {profile.bio && (
            <p className={`max-w-sm text-sm ${mutedClass}`}>{profile.bio}</p>
          )}
        </header>
      )}

      <div className="flex w-full flex-col gap-3">
        {blocks
          .filter((block) => block.enabled)
          .map((block) => (
            <Block
              key={block.id}
              block={block}
              linkRefs={linkRefs}
              shape={shape}
              btnStyle={btnStyle}
              mutedClass={mutedClass}
            />
          ))}
      </div>
    </main>
  )
}

function Block({
  block,
  linkRefs,
  shape,
  btnStyle,
  mutedClass,
}: {
  block: LaunchpadBlock
  linkRefs: Record<string, LinkRef>
  shape: string
  btnStyle: CSSProperties
  mutedClass: string
}) {
  const buttonClass = `block w-full px-5 py-3 text-center text-sm font-medium transition-transform hover:-translate-y-0.5 ${shape}`

  switch (block.type) {
    case 'header':
      // The profile header is rendered once at the top; an in-list header block
      // is a no-op marker.
      return null

    case 'socials':
      return (
        <nav className="flex flex-wrap justify-center gap-3">
          {block.items.map((item) => (
            <a
              key={`${item.platform}:${item.url}`}
              href={safeHref(item.url)}
              target="_blank"
              rel="noreferrer noopener"
              data-block-id={block.id}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              {item.platform}
            </a>
          ))}
        </nav>
      )

    case 'button': {
      const href =
        block.target.kind === 'link'
          ? linkRefs[block.target.linkId]
            ? `/${linkRefs[block.target.linkId]!.slug}`
            : null
          : safeHref(block.target.url)
      if (!href) return null
      const external = block.target.kind === 'url'
      return (
        <a
          href={href}
          data-block-id={block.id}
          className={buttonClass}
          style={btnStyle}
          {...(external
            ? { target: '_blank', rel: 'noreferrer noopener' }
            : {})}
        >
          {block.label}
        </a>
      )
    }

    case 'shortlink': {
      const refs = block.linkIds
        .map((id) => linkRefs[id])
        .filter((ref): ref is LinkRef => Boolean(ref))
      if (refs.length === 0) return null
      return (
        <>
          {refs.map((ref) => (
            <a
              key={ref.slug}
              href={`/${ref.slug}`}
              data-block-id={block.id}
              className={buttonClass}
              style={btnStyle}
            >
              {ref.label}
            </a>
          ))}
        </>
      )
    }

    case 'image': {
      const img = (
        // biome-ignore lint/performance/noImgElement: public render is plain HTML, no next/image
        <img
          src={block.src}
          alt=""
          className="w-full rounded-lg object-cover"
        />
      )
      if (!block.link) return img
      return (
        <a
          href={safeHref(block.link)}
          target="_blank"
          rel="noreferrer noopener"
          data-block-id={block.id}
        >
          {img}
        </a>
      )
    }

    case 'text':
      return (
        <p className={`whitespace-pre-wrap text-center text-sm ${mutedClass}`}>
          {block.text}
        </p>
      )

    case 'divider':
      return <hr className="my-2 w-full border-current opacity-15" />

    default:
      return null
  }
}

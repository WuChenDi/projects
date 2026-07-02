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

const SHAPE_CLASS = {
  rounded: 'rounded-lg',
  pill: 'rounded-full',
  square: 'rounded-none',
} as const

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

  return (
    <main
      data-preset={theme.preset}
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-4 px-5 py-12"
    >
      {(profile.avatar || profile.name || profile.bio) && (
        <header className="flex flex-col items-center gap-2 text-center">
          {profile.avatar && (
            // biome-ignore lint/performance/noImgElement: public render is plain HTML, no next/image
            <img
              src={profile.avatar}
              alt={profile.name ?? ''}
              className="size-20 rounded-full object-cover"
            />
          )}
          {profile.name && (
            <h1 className="text-xl font-semibold">{profile.name}</h1>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
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
              primaryColor={theme.primaryColor}
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
  primaryColor,
}: {
  block: LaunchpadBlock
  linkRefs: Record<string, LinkRef>
  shape: string
  primaryColor: string
}) {
  const buttonClass = `block w-full px-5 py-3 text-center text-sm font-medium text-white ${shape}`
  const buttonStyle = { backgroundColor: primaryColor }

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
          style={buttonStyle}
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
              style={buttonStyle}
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
        <p className="whitespace-pre-wrap text-center text-sm text-muted-foreground">
          {block.text}
        </p>
      )

    case 'divider':
      return <hr className="my-2 w-full border-border" />

    default:
      return null
  }
}

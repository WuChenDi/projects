import type { LinkConfig } from '@/database/schema'

// True for loopback / dev hosts that should never be rendered as a public
// `https://…` short link (single-domain deploys store the request host as the
// link's domain, which in local dev is `localhost` / `sink.localhost`).
function isLocalHost(domain: string): boolean {
  const host = domain.replace(/:\d+$/u, '').toLowerCase()
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1'
  )
}

// Full short URL for a link. Uses the link's explicit domain for real
// multi-domain links, but falls back to the current browser origin (correct
// scheme + port) when there is no domain or the stored domain is a local/dev
// host — otherwise dev links render as the unreachable `https://localhost/<slug>`.
export function buildShortUrl(slug: string, domain: string): string {
  if (domain && !isLocalHost(domain)) return `https://${domain}/${slug}`
  if (typeof window !== 'undefined') return `${window.location.origin}/${slug}`
  return `/${slug}`
}

export function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Short human summary of the advanced routing a link carries, for the table.
export function configBadges(config: LinkConfig): string[] {
  const out: string[] = []
  if (config.passwordHash) out.push('password')
  if (config.geo && Object.keys(config.geo).length) out.push('geo')
  if (config.apple || config.google) out.push('device')
  if (config.unsafe) out.push('unsafe')
  if (config.cloaking) out.push('cloaking')
  return out
}

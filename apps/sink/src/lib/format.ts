import type { LinkConfig } from '@/database/schema'

// Full short URL for a link. Falls back to the current origin when the link has
// no explicit domain (single-domain deploys store domain as the request host).
export function buildShortUrl(slug: string, domain: string): string {
  if (domain) return `https://${domain}/${slug}`
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

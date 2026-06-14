import type { Link } from '@/database/schema'
import { getConfig } from '@/lib/env'

// iOS devices only — desktop macOS must NOT match, or a Mac visitor would be
// sent to a link's App Store URL. `crios` covers Chrome on iOS.
const APPLE_UA = /iphone|ipad|ipod|crios/i
const ANDROID_UA = /android/i

export function isAppleDevice(ua: string): boolean {
  return APPLE_UA.test(ua)
}

export function isAndroidDevice(ua: string): boolean {
  return ANDROID_UA.test(ua)
}

const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'telegrambot',
  'whatsapp',
  'discordbot',
  'slackbot',
  'pinterest',
] as const

export function isSocialCrawler(ua: string): boolean {
  const lower = ua.toLowerCase()
  return SOCIAL_CRAWLERS.some((bot) => lower.includes(bot))
}

// Resolve the final destination for a link, applying geo + device routing and
// optional query-string forwarding. `country` comes from `request.cf.country`.
export function resolveDestination(
  link: Link,
  opts: {
    ua: string
    country: string | undefined
    search: string
    env: CloudflareEnv
  },
): string {
  const { config } = link
  let dest = link.url

  if (config.geo && opts.country && config.geo[opts.country]) {
    dest = config.geo[opts.country]
  }
  if (config.apple && isAppleDevice(opts.ua)) {
    dest = config.apple
  }
  if (config.google && isAndroidDevice(opts.ua)) {
    dest = config.google
  }

  const withQuery =
    config.redirectWithQuery ?? getConfig(opts.env).redirectWithQuery
  if (withQuery && opts.search) {
    try {
      const target = new URL(dest)
      const incoming = new URLSearchParams(opts.search)
      incoming.forEach((value, key) => {
        if (!target.searchParams.has(key))
          target.searchParams.append(key, value)
      })
      dest = target.toString()
    } catch {
      // dest isn't a parseable absolute URL — leave it untouched.
    }
  }

  return dest
}

import type { MiddlewareHandler } from 'hono'
import type { ApiResponse, CloudflareEnv } from '@/types'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Best-effort in-memory rate limit keyed by client IP. State is per-isolate:
// counts reset when the isolate recycles and are not shared across colos.
// Cloudflare Rate Limiting rules / Turnstile are the production-grade upgrade.
export function rateLimit(options: {
  limit: number
  windowMs: number
  keyPrefix: string
}): MiddlewareHandler<{ Bindings: CloudflareEnv }> {
  const { limit, windowMs, keyPrefix } = options
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
    } else {
      bucket.count += 1
      if (bucket.count > limit) {
        return c.json<ApiResponse>(
          { code: 429, message: 'Too many requests' },
          429,
        )
      }
    }
    await next()
  }
}

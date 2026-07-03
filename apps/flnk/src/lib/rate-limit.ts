import { logger } from '@/lib/logger'

// Brute-force gate for password-protected links: a KV fixed-window failure
// counter keyed by client IP + slug. KV floors expirationTtl at 60s.
const MAX_FAILURES = 5
const WINDOW_TTL_SECONDS = 600

function failureKey(ip: string, slug: string): string {
  return `pwfail:${ip}:${slug}`
}

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

// True when this IP has exhausted its failed attempts for the slug. KV errors
// fail open (log + allow) — availability over strictness.
export async function passwordAttemptsExceeded(
  env: CloudflareEnv,
  ip: string,
  slug: string,
): Promise<boolean> {
  try {
    const raw = await env.KV.get(failureKey(ip, slug))
    return Number(raw ?? 0) >= MAX_FAILURES
  } catch (error) {
    logger.warn('KV read error', error instanceof Error ? error.message : error)
    return false
  }
}

// Increment the failure counter; each write refreshes the window TTL. The
// counter is never reset on success — the window simply expires.
export async function recordPasswordFailure(
  env: CloudflareEnv,
  ip: string,
  slug: string,
): Promise<void> {
  const key = failureKey(ip, slug)
  try {
    const raw = await env.KV.get(key)
    const count = Number(raw ?? 0) + 1
    await env.KV.put(key, String(count), { expirationTtl: WINDOW_TTL_SECONDS })
  } catch (error) {
    logger.warn(
      'KV write error',
      error instanceof Error ? error.message : error,
    )
  }
}

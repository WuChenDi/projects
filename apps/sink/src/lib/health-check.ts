import { getConfig } from '@/lib/env'

const TIMEOUT_MS = 5000
const CONCURRENCY = 5
// Hard cap — this endpoint fetches user-stored destination URLs server-side
// (SSRF/abuse surface), so the batch size is bounded in addition to the
// site-token gate, per-request timeout, and bounded concurrency.
export const MAX_LINKS = 100

export interface CheckTarget {
  id: string
  slug: string
  url: string
}

export interface CheckResult extends CheckTarget {
  status: number | null
  ok: boolean
  error?: string
  // null when Safe Browsing (DoH) is not configured.
  unsafe: boolean | null
}

// SSRF guard. The deployed Worker also runs with the `global_fetch_strictly_public`
// compat flag (blocks private/internal/DNS-rebound targets at the platform
// level), but local dev / preview use Node fetch which does not — so validate
// here too. Literal-host checks can't catch a public name resolving to a private
// IP; the platform flag covers that case in production.
function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 0 || a === 127 || a === 10) return true // unspecified, loopback, private
    if (a === 169 && b === 254) return true // link-local incl. 169.254.169.254 metadata
    if (a === 192 && b === 168) return true // private
    if (a === 172 && b >= 16 && b <= 31) return true // private
  }
  // IPv6 unspecified / loopback / link-local / unique-local
  if (
    h === '::' ||
    h === '::1' ||
    h.startsWith('fe80:') ||
    h.startsWith('fc') ||
    h.startsWith('fd')
  ) {
    return true
  }
  return false
}

function validateFetchUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (u.username || u.password) return null // reject userinfo
  if (isBlockedHostname(u.hostname)) return null
  return u
}

async function fetchStatus(
  url: string,
): Promise<{ status: number | null; ok: boolean; error?: string }> {
  const valid = validateFetchUrl(url)
  if (!valid) return { status: null, ok: false, error: 'blocked' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // `redirect: 'manual'` so we never auto-follow a 3xx into an internal host;
    // a redirect counts as reachable (ok) without chasing the Location.
    const res = await fetch(valid.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })
    return { status: res.status, ok: res.status >= 200 && res.status < 400 }
  } catch (error) {
    return {
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : 'fetch failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

// Resolve the host via a filtering DoH resolver; a 0.0.0.0/:: answer means the
// host is blocked (unsafe). Returns null when DoH is unavailable/unparseable.
async function safeBrowsing(
  doh: string,
  host: string,
): Promise<boolean | null> {
  try {
    const res = await fetch(`${doh}?name=${encodeURIComponent(host)}&type=A`, {
      headers: { accept: 'application/dns-json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { Answer?: { data: string }[] }
    return (data.Answer ?? []).some(
      (a) => a.data === '0.0.0.0' || a.data === '::',
    )
  } catch {
    return null
  }
}

export async function runHealthCheck(
  env: CloudflareEnv,
  targets: CheckTarget[],
): Promise<CheckResult[]> {
  const doh = getConfig(env).safeBrowsingDoh
  const queue = [...targets]
  const results: CheckResult[] = []

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const target = queue.shift()!
      const { status, ok, error } = await fetchStatus(target.url)
      let unsafe: boolean | null = null
      if (doh) {
        try {
          unsafe = await safeBrowsing(doh, new URL(target.url).hostname)
        } catch {
          unsafe = null
        }
      }
      results.push({ ...target, status, ok, error, unsafe })
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () =>
      worker(),
    ),
  )
  return results
}

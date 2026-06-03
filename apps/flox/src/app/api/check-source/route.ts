/**
 * Source Health-check API Route
 *
 * Probes a single video source server-side (no CORS) by requesting its recent
 * list (`?ac=detail&pg=1`, no keyword) so the probe works for every source type
 * — including premium ones a keyword search would falsely fail. A source counts
 * as available when it answers 200 with a non-empty maccms `list`.
 *
 * SSRF guard: the target host is attacker-influenced (client sends `baseUrl`),
 * so every hop is restricted to http(s) and public hosts — loopback,
 * link-local (incl. the 169.254.169.254 metadata IP), and RFC1918/ULA ranges
 * are rejected. Redirects are resolved manually (max one hop) and re-validated,
 * since `redirect: 'follow'` would bypass the host check. DNS-level rebinding
 * isn't resolvable here (edge runtime has no `dns` module), but Cloudflare
 * Workers cannot reach private networks regardless.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const TIMEOUT_MS = 10000
const MAX_ATTEMPTS = 2
const MAX_REDIRECTS = 1

/** Reject loopback, link-local, RFC1918, CGNAT and IPv6 ULA/link-local hosts. */
function isBlockedHost(hostname: string): boolean {
  let h = hostname.toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1)

  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === '0.0.0.0' ||
    h === '::' ||
    h === '::1'
  ) {
    return true
  }

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }

  if (h.includes(':')) {
    const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (mapped) return isBlockedHost(mapped[1])
    if (h.startsWith('fc') || h.startsWith('fd')) return true // ULA fc00::/7
    if (/^fe[89ab]/.test(h)) return true // link-local fe80::/10
    return false
  }

  return false
}

/** Parse a candidate URL, allowing only http(s) to a public host. */
function safeUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (isBlockedHost(u.hostname)) return null
  return u
}

async function probe(
  initialUrl: string,
): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let target = initialUrl
    let redirects = 0

    try {
      while (true) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
        const response = await fetch(target, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'manual',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (!location || redirects >= MAX_REDIRECTS) break
          const next = safeUrl(new URL(location, target).toString())
          if (!next) break
          target = next.toString()
          redirects++
          continue
        }

        if (response.ok) {
          const data = (await response.json()) as { list?: unknown }
          if (Array.isArray(data.list) && data.list.length > 0) {
            return { ok: true, latency: Date.now() - start }
          }
        }
        break
      }
    } catch {
      // Network error / timeout → retry
    }
  }

  return { ok: false, latency: Date.now() - start }
}

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, searchPath = '' } = await request.json()

    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const url = safeUrl(`${baseUrl}${searchPath}`)
    if (!url) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    url.searchParams.set('ac', 'detail')
    url.searchParams.set('pg', '1')

    return NextResponse.json(await probe(url.toString()))
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

import { getConfig } from '@/lib/platform/env'

// Resolve a host via a filtering DoH resolver (e.g. a Safe-Browsing-style
// blocklist resolver). A 0.0.0.0/:: answer means the host is blocked (unsafe).
// Returns null when DoH is unavailable/unparseable — callers treat that as
// "inconclusive", never as "safe" or "unsafe".
export async function safeBrowsingHost(
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

// Best-effort "is this URL flagged unsafe?" — used to auto-flag links on
// create/edit. No-op (returns false) when `SAFE_BROWSING_DOH` is unset or the
// check is inconclusive; never throws, so it can't block a link write.
export async function isUnsafeUrl(
  env: CloudflareEnv,
  url: string,
): Promise<boolean> {
  const doh = getConfig(env).safeBrowsingDoh
  if (!doh) return false
  try {
    const host = new URL(url).hostname
    return (await safeBrowsingHost(doh, host)) === true
  } catch {
    return false
  }
}

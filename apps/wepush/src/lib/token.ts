function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 24 random bytes -> 48-char hex. This is the raw Bearer token handed to the
// owner; only its SHA-256 digest is ever persisted (see hashToken).
export function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

// SHA-256 hex digest of a raw token, via Web Crypto (available on the Workers
// runtime — no node:crypto). Used to store/compare pushApiToken without ever
// persisting the raw credential.
export async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(raw),
  )
  return toHex(new Uint8Array(digest))
}

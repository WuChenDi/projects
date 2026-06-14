// Link-password hashing via PBKDF2-SHA256 with a per-link random salt, using
// Web Crypto (available in Workers / Edge / Node 18+). Stored format:
//   pbkdf2$<iterations>$<saltB64>$<keyB64>
// Verification is constant-time. This is the contract the dashboard create flow
// (P1b) must use when populating `config.passwordHash`.
const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const KEY_BYTES = 32

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_BYTES * 8,
  )
  return new Uint8Array(bits)
}

// Constant-time byte comparison — avoids leaking match progress via timing.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function hashLinkPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const derived = await deriveKey(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`
}

export async function verifyLinkPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations <= 0) return false
  try {
    const salt = fromBase64(parts[2])
    const expected = fromBase64(parts[3])
    const derived = await deriveKey(password, salt, iterations)
    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

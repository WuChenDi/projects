// Short-lived signed token proving the password gate was already passed, so
// the unsafe-confirm form never re-carries the plaintext password. Format:
// `${expiresAtMs}.${hexSig}` where hexSig = HMAC-SHA-256(`${slug}:${expiresAtMs}`)
// keyed by BETTER_AUTH_SECRET.

const GATE_TOKEN_TTL_MS = 5 * 60 * 1000

const encoder = new TextEncoder()

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

export async function createGateToken(
  env: CloudflareEnv,
  slug: string,
): Promise<string> {
  const expiresAtMs = Date.now() + GATE_TOKEN_TTL_MS
  const sig = await hmacHex(env.BETTER_AUTH_SECRET, `${slug}:${expiresAtMs}`)
  return `${expiresAtMs}.${sig}`
}

export async function verifyGateToken(
  env: CloudflareEnv,
  slug: string,
  token: string,
): Promise<boolean> {
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expiresAtMs = Number(token.slice(0, dot))
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return false
  const expected = await hmacHex(
    env.BETTER_AUTH_SECRET,
    `${slug}:${expiresAtMs}`,
  )
  const given = token.slice(dot + 1)
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

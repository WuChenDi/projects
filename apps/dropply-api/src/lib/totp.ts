import { getRandomValues, subtle } from '@cdlab996/uncrypto'

function base32Encode(buffer: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | (buffer[i] ?? 0)
    bits += 8

    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }

  while (result.length % 8 !== 0) {
    result += '='
  }

  return result
}

function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  str = str.toUpperCase().replace(/=+$/, '')

  let bits = 0
  let value = 0
  const result: number[] = []

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (!char) throw new Error('Invalid base32 character')

    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character')

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return new Uint8Array(result)
}

async function hmacSHA1(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )

  const signature = await subtle.sign('HMAC', cryptoKey, data as BufferSource)
  return new Uint8Array(signature)
}

export function generateTOTPSecret(): string {
  const buffer = new Uint8Array(20)
  getRandomValues(buffer)
  return base32Encode(buffer)
}

export async function generateTOTP(
  secret: string,
  timeStep: number = Math.floor(Date.now() / 1000 / 30),
): Promise<string> {
  const secretBytes = base32Decode(secret)
  const timeBuffer = new ArrayBuffer(8)
  const timeView = new DataView(timeBuffer)
  timeView.setUint32(4, timeStep, false)

  const hmac = await hmacSHA1(secretBytes, new Uint8Array(timeBuffer))
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f

  const code =
    (((hmac[offset] ?? 0 & 0x7f) << 24) |
      ((hmac[offset + 1] ?? 0 & 0xff) << 16) |
      ((hmac[offset + 2] ?? 0 & 0xff) << 8) |
      (hmac[offset + 3] ?? 0 & 0xff)) %
    1000000

  return code.toString().padStart(6, '0')
}

export async function verifyTOTP(
  token: string,
  secret: string,
  window: number = 1,
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000 / 30)

  for (let i = -window; i <= window; i++) {
    const expectedToken = await generateTOTP(secret, currentTime + i)
    if (token === expectedToken) {
      return true
    }
  }

  return false
}

export function parseTOTPSecrets(secretsEnv: string): Map<string, string> {
  const secrets = new Map<string, string>()

  if (!secretsEnv) return secrets

  const pairs = secretsEnv.split(',')
  for (const pair of pairs) {
    const [name, secret] = pair.trim().split(':')
    if (name && secret) {
      secrets.set(name.trim(), secret.trim())
    }
  }

  return secrets
}

export async function verifyAnyTOTP(
  token: string,
  secretsEnv: string,
): Promise<boolean> {
  const secrets = parseTOTPSecrets(secretsEnv)

  for (const [_name, secret] of secrets) {
    if (await verifyTOTP(token, secret)) {
      return true
    }
  }

  return false
}

import { argon2id } from '@noble/hashes/argon2.js'
import { randomBytes } from '@noble/hashes/utils.js'

const ARGON2_PARAMS = {
  t: 3,
  m: 1280,
  p: 4,
  dkLen: 32,
} as const

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const fromHex = (hex: string) =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => Number.parseInt(b, 16)))

export async function hashPasswordFn(
  password: string,
  providedSalt?: Uint8Array,
): Promise<string> {
  const salt = providedSalt ?? randomBytes(16)
  const hash = argon2id(password, salt, ARGON2_PARAMS)
  return `${toHex(salt)}:${toHex(hash)}`
}

export async function verifyPasswordFn(
  storedHash: string,
  passwordAttempt: string,
): Promise<boolean> {
  const [saltHex, originalHash] = storedHash.split(':')
  if (!saltHex || !originalHash) throw new Error('Invalid hash format')
  const salt = fromHex(saltHex)
  const attempt = await hashPasswordFn(passwordAttempt, salt)
  const [, attemptHash] = attempt.split(':')
  return attemptHash === originalHash
}

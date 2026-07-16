import { argon2id } from '@noble/hashes/argon2.js'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'

// Argon2id params for the 6-digit UI PIN. This only gates the key-manager UI;
// it does NOT encrypt the stored keys.
const ARGON2_PARAMS = { t: 3, m: 1280, p: 4, dkLen: 32 } as const

/** Returns "saltHex:hashHex". */
export function hashPin(pin: string, saltHex?: string): string {
  const salt = saltHex ? hexToBytes(saltHex) : randomBytes(16)
  const hash = argon2id(pin, salt, ARGON2_PARAMS)
  return `${bytesToHex(salt)}:${bytesToHex(hash)}`
}

export function verifyPin(storedHash: string, attempt: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':')
  if (!saltHex || !hashHex) return false
  const rehashed = hashPin(attempt, saltHex)
  return rehashed.split(':')[1] === hashHex
}

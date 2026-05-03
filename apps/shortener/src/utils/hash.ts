import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

const BASE62_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** Generate a random Base62 short code of `length` chars (default 8) */
export function generateRandomHash(length: number = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += BASE62_CHARS[bytes[i]! % 62]
  }
  return out
}

/** sha256(`${domain}:${shortCode}`) as hex */
export function generateHashFromDomainAndCode(
  domain: string,
  shortCode: string,
): string {
  return bytesToHex(sha256(utf8ToBytes(`${domain}:${shortCode}`)))
}

/** Default expiration: 1 hour from now */
export function getDefaultExpiresAt(): number {
  return Date.now() + 60 * 60 * 1000
}

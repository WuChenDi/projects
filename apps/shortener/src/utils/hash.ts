import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

// Base62 character set
const BASE62_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Base62 encoding
 */
function toBase62(num: number): string {
  if (num === 0) return BASE62_CHARS[0]!

  let result = ''
  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result
    num = Math.floor(num / 62)
  }
  return result
}

/**
 * Optimized short code generation - Base62 + timestamp
 */
export function generateRandomHash(length: number = 8): string {
  // Get the last 6 digits of the timestamp + random number
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)

  // Combine timestamp and random number
  const combined = (timestamp % 1000000) * 1000000 + random

  // Convert to Base62
  let shortCode = toBase62(combined)

  // If length is not enough, pad with random characters
  while (shortCode.length < length) {
    const randomChar =
      BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)]
    shortCode = randomChar + shortCode
  }

  // If length is exceeded, slice the last few characters
  if (shortCode.length > length) {
    shortCode = shortCode.slice(-length)
  }

  return shortCode
}

/**
 * Generate a hash from domain and shortCode
 */
export function generateHashFromDomainAndCode(
  domain: string,
  shortCode: string,
): string {
  return bytesToHex(sha256(utf8ToBytes(`${domain}:${shortCode}`)))
}

export function getDefaultExpiresAt(): number {
  const now = new Date()
  now.setHours(now.getHours() + 1)
  return now.getTime()
}

export function isExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false
  return Date.now() > expiresAt
}

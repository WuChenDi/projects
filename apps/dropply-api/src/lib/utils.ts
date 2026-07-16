import { getRandomValues, randomUUID } from '@cdlab/uncrypto'

// Generate UUID v4
export function generateUUID(): string {
  return randomUUID()
}

// Generate 8-char alphanumeric retrieval code using CSPRNG.
// Rejection sampling (accept only bytes < 252, the largest multiple of 36
// below 256) removes modulo bias.
export function generateRetrievalCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 8
  let code = ''
  while (code.length < length) {
    const bytes = new Uint8Array(length - code.length)
    getRandomValues(bytes)
    for (const b of bytes) {
      if (b < 252 && code.length < length) {
        code += chars[b % 36]
      }
    }
  }
  return code
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validate retrieval code format
export function isValidRetrievalCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{6,8}$/
  return codeRegex.test(code)
}

// Calculate expiry time
export function calculateExpiry(validityDays: number): Date {
  return new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
}

// Get file extension
export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1) : null
}

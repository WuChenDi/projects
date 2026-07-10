import { getRandomValues, randomUUID } from '@cdlab/uncrypto'

// Generate UUID v4
export function generateUUID(): string {
  return randomUUID()
}

// Generate 6-digit alphanumeric retrieval code using CSPRNG
export function generateRetrievalCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(6)
  getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validate retrieval code format
export function isValidRetrievalCode(code: string): boolean {
  const codeRegex = /^[A-Z0-9]{6}$/
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

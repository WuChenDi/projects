import { randomUUID } from '@cdlab996/uncrypto'

// Generate UUID v4
export function generateUUID(): string {
  return randomUUID()
}

// Generate 6-digit alphanumeric retrieval code
export function generateRetrievalCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
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
export function calculateExpiry(validityDays: number): Date | null {
  if (validityDays === -1) {
    return null // Permanent
  }
  return new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
}

// Get file extension
export function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1) : null
}

import type { SQL } from 'drizzle-orm'
import { and, eq } from 'drizzle-orm'

/**
 * Helper function to add isDeleted = 0 condition to queries
 */
export function notDeleted<T extends { isDeleted: any }>(table: T) {
  return eq(table.isDeleted, 0)
}

/**
 * Helper function to soft delete a record
 */
export function softDelete() {
  return {
    isDeleted: 1,
    updatedAt: new Date(),
  }
}

/**
 * Combine conditions with not deleted check
 */
export function withNotDeleted<T extends { isDeleted: any }>(
  table: T,
  condition?: SQL | undefined,
) {
  return condition ? and(notDeleted(table), condition) : notDeleted(table)
}

/**
 * Helper function to check if a record is expired
 */
export function isNotExpired<T extends { expiresAt: any }>(table: T) {
  return eq(table.expiresAt, null) // null means never expires
}

/**
 * Combine not deleted and not expired conditions
 */
export function withNotDeletedAndNotExpired<
  T extends { isDeleted: any; expiresAt: any },
>(table: T, condition?: SQL | undefined) {
  const notDeletedCondition = notDeleted(table)
  const baseCondition = condition
    ? and(notDeletedCondition, condition)
    : notDeletedCondition

  return baseCondition
}

/**
 * Helper to create update data with automatic updatedAt timestamp
 */
export function withUpdatedTimestamp<T extends Record<string, any>>(data: T) {
  return {
    ...data,
    updatedAt: new Date(),
  }
}

/**
 * Check if a timestamp is expired (for manual expiration checks)
 */
export function isExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false
  return Date.now() > expiresAt
}

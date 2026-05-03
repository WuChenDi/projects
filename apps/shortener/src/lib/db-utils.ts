import type { SQL } from 'drizzle-orm'
import { and, eq } from 'drizzle-orm'

/** WHERE condition: `isDeleted = 0` */
export function notDeleted<T extends { isDeleted: any }>(table: T) {
  return eq(table.isDeleted, 0)
}

/** Combine `notDeleted(table)` with an additional condition (AND) */
export function withNotDeleted<T extends { isDeleted: any }>(
  table: T,
  condition?: SQL,
) {
  return condition ? and(notDeleted(table), condition) : notDeleted(table)
}

/** Patch object for soft-deleting a record */
export function softDelete() {
  return {
    isDeleted: 1,
    updatedAt: new Date(),
  }
}

/** Manual expiration check (timestamp in ms; null means never expires) */
export function isExpired(expiresAt: number | null): boolean {
  return expiresAt != null && Date.now() > expiresAt
}

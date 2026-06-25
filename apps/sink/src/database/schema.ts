import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

const trackingFields = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  isDeleted: integer('is_deleted').notNull().default(0),
}

// Per-link behaviour, stored as a single JSON column so the redirect engine can
// read everything in one row. All fields are optional — an empty object means a
// plain redirect to `url`.
export interface LinkConfig {
  // Geo routing: ISO-3166-1 alpha-2 country code → destination URL.
  geo?: Record<string, string>
  // Device routing: override destination for Apple / Android user agents.
  apple?: string
  google?: string
  // Social-bot OG metadata.
  title?: string
  description?: string
  image?: string
  // When true, serve the OG HTML to everyone (link cloaking) instead of redirecting.
  cloaking?: boolean
  // Per-link override of the global REDIRECT_WITH_QUERY behaviour.
  redirectWithQuery?: boolean
  // When true, show an interstitial warning before redirecting.
  unsafe?: boolean
  // Click limit: expire the link after this many visits (KV counter `visits:{id}`).
  maxVisits?: number
  // When true, the link is paused: the redirect path serves not-found without
  // soft-deleting the row.
  disabled?: boolean
  // PBKDF2 hash of the link password (`pbkdf2$<iters>$<saltB64>$<keyB64>`, see
  // lib/hash.ts); when set, the destination is gated behind a password form.
  passwordHash?: string
}

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    domain: text('domain').notNull().default(''),
    url: text('url').notNull(),
    comment: text('comment').notNull().default(''),
    // Email of the signed-in user who created the link (empty for legacy rows).
    createdBy: text('created_by').notNull().default(''),
    tags: text('tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    config: text('config', { mode: 'json' })
      .$type<LinkConfig>()
      .notNull()
      .default({}),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    ...trackingFields,
  },
  (table) => [
    uniqueIndex('uniq_links_slug_domain').on(table.slug, table.domain),
  ],
)

// better-auth core tables. Column/table names must match better-auth's expected
// schema so the drizzle adapter maps them without overrides.

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export type Link = typeof links.$inferSelect
export type NewLink = typeof links.$inferInsert

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Account = typeof account.$inferSelect
export type Verification = typeof verification.$inferSelect

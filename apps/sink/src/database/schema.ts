import {
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

export type Link = typeof links.$inferSelect
export type NewLink = typeof links.$inferInsert

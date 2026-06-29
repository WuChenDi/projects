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

// better-auth core tables. Column/table names must match better-auth's expected
// schema so the drizzle adapter maps them without overrides. Each signed-in
// `user` is a tenant — every business row below is scoped to its `ownerId`.

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

// Per-tenant configuration. Replaces the former single-row `global_config`
// (id=1): every signed-in user owns exactly one config row (PK = ownerId),
// carrying their own WeChat credentials, throttle knobs, cron settings and a
// dedicated push API token (which the Bearer path resolves back to the owner).
export const userConfig = sqliteTable(
  'user_config',
  {
    ownerId: text('owner_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    wechatAppId: text('wechat_app_id').notNull().default(''),
    wechatAppSecret: text('wechat_app_secret').notNull().default(''),
    defaultWechatTemplateId: text('default_wechat_template_id')
      .notNull()
      .default(''),
    maxPushOneMinute: integer('max_push_one_minute').notNull().default(5),
    sleepTime: integer('sleep_time').notNull().default(65000),
    apiTimeout: integer('api_timeout').notNull().default(10000),
    maxRetries: integer('max_retries').notNull().default(3),
    retryDelay: integer('retry_delay').notNull().default(2000),
    pushApiToken: text('push_api_token').notNull().default(''),
    cronEnabled: integer('cron_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    // JSON array of recipient ids participating in scheduled cron pushes
    cronUserIds: text('cron_user_ids', { mode: 'json' })
      .notNull()
      .$type<string[]>()
      .default([]),
    ...trackingFields,
  },
  (table) => [index('idx_user_config_push_api_token').on(table.pushApiToken)],
)

export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    title: text('title').notNull().default(''),
    desc: text('desc').notNull().default(''),
    ...trackingFields,
  },
  // Template codes are unique per owner, not globally. This index also serves
  // owner-scoped lookups (by ownerId prefix, and by ownerId+code).
  (table) => [
    uniqueIndex('uniq_templates_owner_code').on(table.ownerId, table.code),
  ],
)

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default(''),
    wechatOpenId: text('wechat_open_id').notNull().default(''),
    wechatTemplateId: text('wechat_template_id').notNull().default(''),
    templateCode: text('template_code').notNull().default(''),
    city: text('city').notNull().default(''),
    weatherCityCode: text('weather_city_code').notNull().default(''),
    horoscopeDate: text('horoscope_date'),
    showColor: integer('show_color', { mode: 'boolean' })
      .notNull()
      .default(true),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    ...trackingFields,
  },
  (table) => [
    index('idx_users_owner_id').on(table.ownerId),
    index('idx_users_template_code').on(table.templateCode),
  ],
)

// festivals / customDates hang off a recipient (users.id) via cascade and are
// only ever reached through an owner-validated recipient, so they inherit tenant
// isolation transitively and don't carry their own ownerId.
export const festivals = sqliteTable(
  'festivals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    date: text('date').notNull(), // MM-DD
    isLunar: integer('is_lunar', { mode: 'boolean' }).notNull().default(false),
    ...trackingFields,
  },
  (table) => [index('idx_festivals_user_id').on(table.userId)],
)

export const customDates = sqliteTable(
  'custom_dates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keyword: text('keyword').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    ...trackingFields,
  },
  (table) => [index('idx_custom_dates_user_id').on(table.userId)],
)

export const pushBatches = sqliteTable(
  'push_batches',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    trigger: text('trigger', { enum: ['manual', 'api', 'cron'] }).notNull(),
    status: text('status', {
      enum: ['running', 'success', 'partial', 'failed'],
    }).notNull(),
    totalCount: integer('total_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    ...trackingFields,
  },
  (table) => [
    index('idx_push_batches_owner_id').on(table.ownerId),
    index('idx_push_batches_started_at').on(table.startedAt),
  ],
)

export const pushLogs = sqliteTable(
  'push_logs',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    batchId: text('batch_id')
      .notNull()
      .references(() => pushBatches.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    templateCode: text('template_code').notNull(),
    status: text('status', { enum: ['success', 'failed'] }).notNull(),
    renderedTitle: text('rendered_title').notNull().default(''),
    renderedDesc: text('rendered_desc').notNull().default(''),
    variableSnapshot: text('variable_snapshot', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    errorMessage: text('error_message'),
    errorPayload: text('error_payload', { mode: 'json' }).$type<unknown>(),
    sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
    ...trackingFields,
  },
  (table) => [
    index('idx_push_logs_owner_id').on(table.ownerId),
    index('idx_push_logs_batch_id').on(table.batchId),
    index('idx_push_logs_user_id').on(table.userId),
    index('idx_push_logs_sent_at').on(table.sentAt),
  ],
)

export type AuthUser = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Account = typeof account.$inferSelect
export type Verification = typeof verification.$inferSelect

export type UserConfig = typeof userConfig.$inferSelect
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
// `User` / `NewUser` are the push *recipient* rows (table `users`), distinct
// from the better-auth `AuthUser` above. Kept under this name because the
// console UI references recipients as `User` throughout.
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Festival = typeof festivals.$inferSelect
export type CustomDate = typeof customDates.$inferSelect
export type PushBatch = typeof pushBatches.$inferSelect
export type PushLog = typeof pushLogs.$inferSelect

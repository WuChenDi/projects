import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

// Single-row global configuration (id pinned to 1).
export const globalConfig = sqliteTable('global_config', {
  id: integer('id').primaryKey(), // always 1
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
  // JSON array of user ids participating in scheduled cron pushes
  cronUserIds: text('cron_user_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  ...trackingFields,
})

export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull().default(''),
    desc: text('desc').notNull().default(''),
    ...trackingFields,
  },
  (table) => [index('idx_templates_code').on(table.code)],
)

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
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
  (table) => [index('idx_users_template_code').on(table.templateCode)],
)

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
  (table) => [index('idx_push_batches_started_at').on(table.startedAt)],
)

export const pushLogs = sqliteTable(
  'push_logs',
  {
    id: text('id').primaryKey(),
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
    index('idx_push_logs_batch_id').on(table.batchId),
    index('idx_push_logs_user_id').on(table.userId),
    index('idx_push_logs_sent_at').on(table.sentAt),
  ],
)

export type GlobalConfig = typeof globalConfig.$inferSelect
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Festival = typeof festivals.$inferSelect
export type CustomDate = typeof customDates.$inferSelect
export type PushBatch = typeof pushBatches.$inferSelect
export type PushLog = typeof pushLogs.$inferSelect

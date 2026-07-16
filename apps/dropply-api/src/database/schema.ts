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

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // UUID v4
    retrievalCode: text('retrieval_code'),
    uploadComplete: integer('upload_complete').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    ...trackingFields,
  },
  (table) => [
    uniqueIndex('idx_sessions_retrieval_code').on(table.retrievalCode),
    index('idx_sessions_expires_at').on(table.expiresAt),
    index('idx_sessions_upload_complete_created_at').on(
      table.uploadComplete,
      table.createdAt,
    ),
  ],
)

export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey(), // UUID v4
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    fileExtension: text('file_extension'),
    isText: integer('is_text').notNull().default(0),
    ...trackingFields,
  },
  (table) => [index('idx_files_session_id').on(table.sessionId)],
)

export const multipartUploads = sqliteTable(
  'multipart_uploads',
  {
    fileId: text('file_id').primaryKey(), // UUID v4
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    r2UploadId: text('r2_upload_id').notNull(),
    ...trackingFields,
  },
  (table) => [index('idx_multipart_uploads_session_id').on(table.sessionId)],
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
export type MultipartUpload = typeof multipartUploads.$inferSelect
export type NewMultipartUpload = typeof multipartUploads.$inferInsert

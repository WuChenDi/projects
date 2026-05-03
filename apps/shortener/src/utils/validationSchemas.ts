import * as z from 'zod'

export const urlRecordSchema = z.object({
  url: z
    .url('Please provide a valid URL (e.g., https://example.com)')
    .min(1, 'URL cannot be empty'),
  hash: z
    .string()
    .min(1, 'Hash cannot be empty')
    .max(50, 'Hash must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Hash can only contain letters, numbers, hyphens, and underscores',
    )
    .optional(),
  expiresAt: z
    .number()
    .int('Expiration time must be a valid timestamp')
    .positive('Expiration time must be in the future')
    .optional(),
  userId: z
    .string()
    .max(100, 'User ID must be less than 100 characters')
    .optional(),
  attribute: z.any().optional(),
})

export const updateUrlRecordSchema = z.object({
  hash: z
    .string()
    .min(1, 'Hash is required for updates')
    .max(50, 'Hash must be less than 50 characters'),
  url: z
    .string()
    .url('Please provide a valid URL (e.g., https://example.com)')
    .optional(),
  userId: z
    .string()
    .max(100, 'User ID must be less than 100 characters')
    .optional(),
  expiresAt: z
    .number()
    .int('Expiration time must be a valid timestamp')
    .positive('Expiration time must be in the future')
    .optional(),
  attribute: z.any().optional(),
})

export const createUrlRequestSchema = z.object({
  records: z
    .array(urlRecordSchema)
    .min(1, 'At least one URL record is required')
    .max(100, 'Cannot process more than 100 records at once'),
})

export const updateUrlRequestSchema = z.object({
  records: z
    .array(updateUrlRecordSchema)
    .min(1, 'At least one record is required for update')
    .max(100, 'Cannot process more than 100 records at once'),
})

export const deleteUrlRequestSchema = z.object({
  hashList: z
    .array(
      z
        .string()
        .min(1, 'Hash cannot be empty')
        .max(100, 'Hash must be less than 100 characters'),
    )
    .min(1, 'At least one hash is required for deletion')
    .max(100, 'Cannot delete more than 100 records at once'),
})

export const queryUrlSchema = z.object({
  isDeleted: z
    .string()
    .transform((val) => val === '1' || val === 'true')
    .optional(),
  userId: z.string().optional(),
  limit: z
    .string()
    .transform((val) => Number.parseInt(val))
    .pipe(z.number().min(1).max(1000))
    .optional(),
  offset: z
    .string()
    .transform((val) => Number.parseInt(val))
    .pipe(z.number().min(0))
    .optional(),
})

export const isDeletedQuerySchema = z.object({
  isDeleted: z
    .union([z.literal('0'), z.literal('1')])
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
})

export const slugSchema = z.object({
  url: z.url('Invalid URL format'),
  cache: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default(true),
})

export const batchSlugSchema = z.object({
  urls: z
    .array(z.url('Invalid URL format'))
    .min(1)
    .max(10, 'Maximum 10 URLs per batch'),
  cache: z.boolean().optional().default(true),
})

export const suggestionsSchema = z.object({
  url: z.url('Invalid URL format'),
  count: z.coerce
    .number()
    .min(1, 'Count must be at least 1')
    .max(5, 'Count cannot exceed 5')
    .default(3),
})

export const analyticsQuerySchema = z.object({
  linkId: z.string().optional(),
  userId: z.string().optional(),
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'Hash must be a 64-character hexadecimal string')
    .optional(),
  domain: z.string().optional(),
  country: z.string().optional(),
  startTime: z
    .string()
    .transform((val) => Number.parseInt(val))
    .optional(),
  endTime: z
    .string()
    .transform((val) => Number.parseInt(val))
    .optional(),
  limit: z
    .string()
    .optional()
    .default('100')
    .transform((val) => Number.parseInt(val)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((val) => Number.parseInt(val)),
})

export const timeSeriesQuerySchema = analyticsQuerySchema.extend({
  interval: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  timezone: z.string().default('UTC'),
})

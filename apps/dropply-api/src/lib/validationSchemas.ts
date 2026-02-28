import * as z from 'zod'

export const totpTokenSchema = z.object({
  totpToken: z
    .string()
    .length(6, 'TOTP token must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP token must contain only digits')
    .optional(),
})

export const createChestRequestSchema = z.object({
  totpToken: z
    .string()
    .length(6, 'TOTP token must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP token must contain only digits')
    .optional(),
})

export const completeUploadRequestSchema = z.object({
  fileIds: z
    .array(z.string().uuid('File ID must be a valid UUID'))
    .min(1, 'At least one file ID is required')
    .max(100, 'Cannot process more than 100 files at once'),
  validityDays: z
    .number()
    .int('Validity days must be an integer')
    .refine(
      (val) => val === -1 || (val >= 1 && val <= 365),
      'Validity days must be -1 (permanent) or between 1 and 365',
    ),
})

export const createMultipartUploadRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename too long'),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/,
      'Invalid MIME type format',
    ),
  fileSize: z
    .number()
    .int('File size must be an integer')
    .positive('File size must be positive')
    .max(5 * 1024 * 1024 * 1024, 'File size cannot exceed 5GB'), // 5GB limit
})

export const completeMultipartUploadRequestSchema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z
          .number()
          .int('Part number must be an integer')
          .min(1, 'Part number must be at least 1')
          .max(10000, 'Part number cannot exceed 10000'),
        etag: z.string().min(1, 'ETag is required'),
      }),
    )
    .min(1, 'At least one part is required')
    .max(10000, 'Cannot have more than 10000 parts'),
})

export const sessionIdParamSchema = z.object({
  sessionId: z.uuid('Session ID must be a valid UUID'),
})

export const fileIdParamSchema = z.object({
  fileId: z.uuid('File ID must be a valid UUID'),
})

export const partNumberParamSchema = z.object({
  partNumber: z
    .string()
    .regex(/^\d+$/, 'Part number must be numeric')
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => val >= 1 && val <= 10000,
      'Part number must be between 1 and 10000',
    ),
})

export const downloadQuerySchema = z.object({
  token: z.string().optional(),
  filename: z.string().optional(),
})

export const retrievalCodeParamSchema = z.object({
  retrievalCode: z
    .string()
    .length(6, 'Retrieval code must be 6 characters')
    .regex(
      /^[A-Z0-9]{6}$/,
      'Retrieval code must contain only uppercase letters and numbers',
    ),
})

export const emailShareSchema = z.object({
  retrievalCode: z
    .string()
    .length(6, 'Retrieval code must be 6 characters')
    .regex(/^[A-Z0-9]{6}$/, 'Invalid retrieval code format'),
  recipientEmail: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email address too long'),
  recipientName: z.string().max(100, 'Recipient name too long').optional(),
  senderName: z.string().max(100, 'Sender name too long').optional(),
  message: z.string().max(500, 'Message too long').optional(),
})

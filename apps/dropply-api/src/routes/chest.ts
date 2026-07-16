import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { files, multipartUploads, sessions } from '@/database/schema'
import {
  calculateExpiry,
  completeMultipartUploadRequestSchema,
  completeUploadRequestSchema,
  createChestRequestSchema,
  createMultipartJWT,
  createMultipartUploadRequestSchema,
  createUploadJWT,
  fileIdParamSchema,
  generateRetrievalCode,
  generateUUID,
  getFileExtension,
  partNumberParamSchema,
  sessionIdParamSchema,
  useDrizzle,
  verifyMultipartJWT,
  verifyUploadJWT,
  withNotDeleted,
} from '@/lib'
import { rateLimit } from '@/lib/rate-limit'
import type {
  ApiResponse,
  CloudflareEnv,
  CompleteMultipartUploadResponse,
  CompleteUploadResponse,
  CreateChestResponse,
  CreateMultipartUploadResponse,
  MultipartJWTPayload,
  UploadFileResponse,
  UploadJWTPayload,
  UploadPartResponse,
} from '@/types'

export const chestRoutes = new Hono<{ Bindings: CloudflareEnv }>()

// Constant-time string compare: digest both sides so lengths match, then
// XOR-compare the digest bytes.
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ])
  const bytesA = new Uint8Array(digestA)
  const bytesB = new Uint8Array(digestB)
  let diff = 0
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i]
  }
  return diff === 0
}

// POST /chest - Create new chest
chestRoutes.post(
  '/chest',
  rateLimit({ limit: 20, windowMs: 60_000, keyPrefix: 'chest' }),
  zValidator('json', createChestRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')

    const db = useDrizzle(c)
    const { password } = c.req.valid('json')

    // Optional share-password gate
    if (c.env.SHARE_PASSWORD) {
      if (!password) {
        return c.json<ApiResponse>(
          {
            code: 401,
            message: 'Password required',
          },
          401,
        )
      }

      const isValid = await constantTimeEqual(password, c.env.SHARE_PASSWORD)
      if (!isValid) {
        return c.json<ApiResponse>(
          {
            code: 401,
            message: 'Invalid password',
          },
          401,
        )
      }
    }

    const sessionId = generateUUID()
    const uploadToken = await createUploadJWT(sessionId, c.env.JWT_SECRET)

    try {
      await db?.insert(sessions).values({
        id: sessionId,
        uploadComplete: 0,
      })

      logger.info('Created new chest session', { sessionId })

      const response: CreateChestResponse = {
        sessionId,
        uploadToken,
        expiresIn: 86400, // 24 hours
      }

      return c.json<ApiResponse<CreateChestResponse>>({
        code: 0,
        message: 'ok',
        data: {
          ...response,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to create chest session, ${JSON.stringify({
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create session'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

// POST /chest/:sessionId/upload - Upload files
chestRoutes.post(
  '/chest/:sessionId/upload',
  zValidator('param', sessionIdParamSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const db = useDrizzle(c)
    const { sessionId } = c.req.valid('param')

    // Verify JWT token
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    const token = authHeader.substring(7)
    let payload: UploadJWTPayload
    try {
      payload = await verifyUploadJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid token',
        },
        401,
      )
    }

    if (payload.sessionId !== sessionId) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Invalid session',
        },
        400,
      )
    }

    // Check if session exists and is not completed
    const session = await db
      ?.select()
      .from(sessions)
      .where(
        withNotDeleted(
          sessions,
          and(eq(sessions.id, sessionId), eq(sessions.uploadComplete, 0)),
        ),
      )
      .get()

    if (!session) {
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Session not found or already completed',
        },
        404,
      )
    }

    // Parse form data
    const formData = await c.req.formData()
    const uploadedFiles: Array<{
      fileId: string
      filename: string
      isText: boolean
    }> = []
    const r2Operations: Promise<any>[] = []
    const fileInserts: any[] = []

    const maxBytes =
      (c.env.MAX_FILE_SIZE_MB
        ? Number.parseInt(c.env.MAX_FILE_SIZE_MB, 10)
        : 100) *
      1024 *
      1024

    // Process file uploads
    for (const [key, entry] of formData.entries()) {
      const value = entry as unknown as File
      if (key === 'files' && value instanceof File) {
        if (value.size > maxBytes) {
          return c.json<ApiResponse>(
            {
              code: 413,
              message: 'File too large',
            },
            413,
          )
        }
        const fileId = generateUUID()
        const filename = value.name || 'unnamed-file'
        const mimeType = value.type || 'application/octet-stream'
        const fileSize = value.size

        // Queue R2 operations
        r2Operations.push(
          c.env.R2_STORAGE.put(`${sessionId}/${fileId}`, value.stream()),
        )

        // Queue database operations
        fileInserts.push({
          id: fileId,
          sessionId,
          originalFilename: filename,
          mimeType,
          fileSize,
          fileExtension: getFileExtension(filename),
          isText: 0,
        })

        uploadedFiles.push({ fileId, filename, isText: false })
      }
    }

    try {
      // Execute all operations in parallel
      await Promise.all([
        Promise.all(r2Operations),
        fileInserts.length > 0
          ? db?.insert(files).values(fileInserts)
          : Promise.resolve(),
      ])

      logger.info('Files uploaded successfully', {
        sessionId,
        count: uploadedFiles.length,
      })

      return c.json<ApiResponse<UploadFileResponse>>({
        code: 0,
        message: 'ok',
        data: { uploadedFiles },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to upload files, ${JSON.stringify({
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload files'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

// POST /chest/:sessionId/complete - Complete upload and generate retrieval code
chestRoutes.post(
  '/chest/:sessionId/complete',
  zValidator('param', sessionIdParamSchema),
  zValidator('json', completeUploadRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const db = useDrizzle(c)
    const { sessionId } = c.req.valid('param')
    const { fileIds, validityDays } = c.req.valid('json')

    // Verify the JWT token
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    const token = authHeader.substring(7)
    let payload: UploadJWTPayload
    try {
      payload = await verifyUploadJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid token',
        },
        401,
      )
    }

    if (payload.sessionId !== sessionId) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Invalid session',
        },
        400,
      )
    }

    // Verify file ownership — every submitted fileId must belong to this session
    const sessionFiles = await db
      ?.select()
      .from(files)
      .where(withNotDeleted(files, eq(files.sessionId, sessionId)))

    const sessionFileIds = new Set(sessionFiles?.map((f) => f.id) ?? [])
    if (fileIds.some((id) => !sessionFileIds.has(id))) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Some files do not belong to this session',
        },
        400,
      )
    }

    let retrievalCode = generateRetrievalCode()
    const expiryDate = calculateExpiry(validityDays)

    try {
      // Update session; retry with a fresh code on unique-index collisions
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await db
            ?.update(sessions)
            .set({
              retrievalCode,
              uploadComplete: 1,
              expiresAt: expiryDate,
              updatedAt: new Date(),
            })
            .where(
              withNotDeleted(
                sessions,
                and(eq(sessions.id, sessionId), eq(sessions.uploadComplete, 0)),
              ),
            )
          break
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (/unique|constraint/i.test(message) && attempt < 3) {
            retrievalCode = generateRetrievalCode()
            continue
          }
          throw error
        }
      }

      logger.info('Chest upload completed', {
        sessionId,
        retrievalCode,
        expiryDate,
      })

      return c.json<ApiResponse<CompleteUploadResponse>>({
        code: 0,
        message: 'ok',
        data: {
          retrievalCode,
          expiryDate: expiryDate?.toISOString() || null,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to complete upload, ${JSON.stringify({
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to complete upload'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

// POST /chest/:sessionId/multipart/create - Create multipart upload
chestRoutes.post(
  '/chest/:sessionId/multipart/create',
  zValidator('param', sessionIdParamSchema),
  zValidator('json', createMultipartUploadRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const db = useDrizzle(c)
    const { sessionId } = c.req.valid('param')
    const { filename, mimeType, fileSize } = c.req.valid('json')

    const maxBytes =
      (c.env.MAX_FILE_SIZE_MB
        ? Number.parseInt(c.env.MAX_FILE_SIZE_MB, 10)
        : 100) *
      1024 *
      1024
    if (fileSize > maxBytes) {
      return c.json<ApiResponse>(
        {
          code: 413,
          message: 'File too large',
        },
        413,
      )
    }

    // Validate JWT token
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    const token = authHeader.substring(7)
    let payload: UploadJWTPayload
    try {
      payload = await verifyUploadJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid token',
        },
        401,
      )
    }

    if (payload.sessionId !== sessionId) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Invalid session',
        },
        400,
      )
    }

    // Check if session exists and is not completed
    const session = await db
      ?.select()
      .from(sessions)
      .where(
        withNotDeleted(
          sessions,
          and(eq(sessions.id, sessionId), eq(sessions.uploadComplete, 0)),
        ),
      )
      .get()

    if (!session) {
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Session not found or already completed',
        },
        404,
      )
    }

    const fileId = generateUUID()

    try {
      // Create multipart upload in R2
      const multipartUpload = await c.env.R2_STORAGE.createMultipartUpload(
        `${sessionId}/${fileId}`,
      )

      // Track the multipart upload so orphans can be aborted by cleanup
      await db?.insert(multipartUploads).values({
        fileId,
        sessionId,
        r2UploadId: multipartUpload.uploadId,
      })

      // Create multipart JWT (valid for 48 hours)
      const multipartToken = await createMultipartJWT(
        sessionId,
        fileId,
        multipartUpload.uploadId,
        filename,
        mimeType,
        fileSize,
        c.env.JWT_SECRET,
      )

      logger.info('Multipart upload created', { sessionId, fileId, filename })

      return c.json<ApiResponse<CreateMultipartUploadResponse>>({
        code: 0,
        message: 'ok',
        data: {
          fileId,
          uploadId: multipartToken,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to create multipart upload, ${JSON.stringify({
          sessionId,
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create multipart upload'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

// PUT /chest/:sessionId/multipart/:fileId/part/:partNumber - Upload part
chestRoutes.put(
  '/chest/:sessionId/multipart/:fileId/part/:partNumber',
  zValidator(
    'param',
    sessionIdParamSchema.merge(fileIdParamSchema).merge(partNumberParamSchema),
  ),
  async (c) => {
    const requestId = c.get('requestId')
    const { sessionId, fileId, partNumber } = c.req.valid('param')

    // Validate part JWT token
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    const token = authHeader.substring(7)
    let payload: MultipartJWTPayload
    try {
      payload = await verifyMultipartJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid multipart token',
        },
        401,
      )
    }

    if (payload.sessionId !== sessionId || payload.fileId !== fileId) {
      return c.json<ApiResponse>(
        {
          code: 403,
          message: 'Token does not match upload session',
        },
        403,
      )
    }

    // Get request body
    const body = await c.req.arrayBuffer()
    if (!body || body.byteLength === 0) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Empty part body',
        },
        400,
      )
    }

    try {
      // Resume multipart upload and upload part
      const multipartUpload = c.env.R2_STORAGE.resumeMultipartUpload(
        `${sessionId}/${fileId}`,
        payload.uploadId,
      )
      const uploadedPart = await multipartUpload.uploadPart(partNumber, body)

      logger.info('Part uploaded successfully', {
        sessionId,
        fileId,
        partNumber,
      })

      return c.json<ApiResponse<UploadPartResponse>>({
        code: 0,
        message: 'ok',
        data: {
          etag: uploadedPart.etag,
          partNumber,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to upload part, ${JSON.stringify({
          sessionId,
          fileId,
          partNumber,
          error,
        })}`,
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload part'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

// POST /chest/:sessionId/multipart/:fileId/complete - Complete multipart upload
chestRoutes.post(
  '/chest/:sessionId/multipart/:fileId/complete',
  zValidator('param', sessionIdParamSchema.merge(fileIdParamSchema)),
  zValidator('json', completeMultipartUploadRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const db = useDrizzle(c)
    const { sessionId, fileId } = c.req.valid('param')
    const { parts } = c.req.valid('json')

    // Validate part JWT token
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    const token = authHeader.substring(7)
    let payload: MultipartJWTPayload
    try {
      payload = await verifyMultipartJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid multipart token',
        },
        401,
      )
    }

    if (payload.sessionId !== sessionId || payload.fileId !== fileId) {
      return c.json<ApiResponse>(
        {
          code: 403,
          message: 'Token does not match upload session',
        },
        403,
      )
    }

    // Sort parts by part number
    const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber)

    try {
      // Resume multipart upload and complete
      const multipartUpload = c.env.R2_STORAGE.resumeMultipartUpload(
        `${sessionId}/${fileId}`,
        payload.uploadId,
      )
      await multipartUpload.complete(sortedParts)

      // Insert file record into database after successful completion
      await db?.insert(files).values({
        id: fileId,
        sessionId,
        originalFilename: payload.filename,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
        fileExtension: getFileExtension(payload.filename),
        isText: 0,
      })

      // Soft-delete the multipart tracking row — upload is no longer orphanable
      await db
        ?.update(multipartUploads)
        .set({
          isDeleted: 1,
          updatedAt: new Date(),
        })
        .where(
          withNotDeleted(multipartUploads, eq(multipartUploads.fileId, fileId)),
        )

      logger.info('Multipart upload completed', {
        sessionId,
        fileId,
        filename: payload.filename,
      })

      return c.json<ApiResponse<CompleteMultipartUploadResponse>>({
        code: 0,
        message: 'ok',
        data: {
          fileId,
          filename: payload.filename,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to complete multipart upload, ${JSON.stringify({
          sessionId,
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to complete multipart upload'
      return c.json<ApiResponse>(
        {
          code: 500,
          message: errorMessage,
        },
        500,
      )
    }
  },
)

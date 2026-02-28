import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { files, sessions } from '@/database/schema'
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
  verifyAnyTOTP,
  verifyMultipartJWT,
  verifyUploadJWT,
  withNotDeleted,
} from '@/lib'
import type {
  ApiResponse,
  CloudflareEnv,
  CompleteMultipartUploadResponse,
  CompleteUploadResponse,
  CreateChestResponse,
  CreateMultipartUploadResponse,
  UploadFileResponse,
  UploadPartResponse,
} from '@/types'

export const chestRoutes = new Hono<{ Bindings: CloudflareEnv }>()

// POST /chest - Create new chest
chestRoutes.post(
  '/chest',
  zValidator('json', createChestRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')

    const db = useDrizzle(c)
    const requireTOTP = c.env.REQUIRE_TOTP === 'true'
    const { totpToken } = c.req.valid('json')

    // TOTP verification
    if (requireTOTP) {
      if (!totpToken) {
        return c.json<ApiResponse>(
          {
            code: 401,
            message: 'TOTP token required',
          },
          401,
        )
      }

      if (!c.env.TOTP_SECRETS) {
        return c.json<ApiResponse>(
          {
            code: 500,
            message: 'TOTP not configured on server',
          },
          500,
        )
      }

      const isValidTOTP = await verifyAnyTOTP(totpToken, c.env.TOTP_SECRETS)
      if (!isValidTOTP) {
        return c.json<ApiResponse>(
          {
            code: 401,
            message: 'Invalid TOTP token',
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
    let payload
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

    // Process file uploads
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
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

    // Process text items
    const textItems = formData.getAll('textItems')
    for (const textItem of textItems) {
      if (typeof textItem === 'string') {
        const textData = JSON.parse(textItem)
        const fileId = generateUUID()
        const filename = textData.filename || `text-${Date.now()}.txt`
        const content = textData.content
        const mimeType = 'text/plain'
        const fileSize = new TextEncoder().encode(content).length

        r2Operations.push(
          c.env.R2_STORAGE.put(`${sessionId}/${fileId}`, content),
        )

        fileInserts.push({
          id: fileId,
          sessionId,
          originalFilename: filename,
          mimeType,
          fileSize,
          fileExtension: getFileExtension(filename),
          isText: 1,
        })

        uploadedFiles.push({ fileId, filename, isText: true })
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

    // 验证JWT令牌
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
    let payload
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

    // Verify file ownership
    const fileCount = await db
      ?.select()
      .from(files)
      .where(withNotDeleted(files, eq(files.sessionId, sessionId)))

    if (fileCount?.length !== fileIds.length) {
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Some files do not belong to this session',
        },
        400,
      )
    }

    const retrievalCode = generateRetrievalCode()
    const expiryDate = calculateExpiry(validityDays)

    try {
      // Update session
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
    let payload
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
    let payload
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
    let payload
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

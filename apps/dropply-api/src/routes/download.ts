import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { files, sessions } from '@/database/schema'
import {
  downloadQuerySchema,
  fileIdParamSchema,
  useDrizzle,
  verifyChestJWT,
  withNotDeleted,
} from '@/lib'
import type { ApiResponse, CloudflareEnv } from '@/types'

export const downloadRoutes = new Hono<{ Bindings: CloudflareEnv }>()

// GET /download/:fileId - Download file
downloadRoutes.get(
  '/download/:fileId',
  zValidator('param', fileIdParamSchema),
  zValidator('query', downloadQuerySchema),
  async (c) => {
    const db = useDrizzle(c)
    const { fileId } = c.req.valid('param')
    const { token: tokenFromQuery, filename: filenameFromQuery } =
      c.req.valid('query')

    // Extract token
    const authHeader = c.req.header('Authorization')

    let token: string
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (tokenFromQuery) {
      token = tokenFromQuery
    } else {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Unauthorized',
        },
        401,
      )
    }

    let payload
    try {
      payload = await verifyChestJWT(token, c.env.JWT_SECRET)
    } catch (error) {
      return c.json<ApiResponse>(
        {
          code: 401,
          message: 'Invalid token',
        },
        401,
      )
    }

    // Get file metadata and validate session is still valid
    const fileWithSession = await db
      ?.select()
      .from(files)
      .innerJoin(sessions, eq(files.sessionId, sessions.id))
      .where(
        and(
          eq(files.id, fileId),
          eq(files.sessionId, payload.sessionId),
          withNotDeleted(files),
          withNotDeleted(sessions),
        ),
      )

    // Check query result
    const result = fileWithSession?.[0]
    if (!result) {
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'File not found or session expired',
        },
        404,
      )
    }

    // Check if session is expired
    if (result.sessions.expiresAt && result.sessions.expiresAt < new Date()) {
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'File session expired',
        },
        404,
      )
    }

    // Get file from R2
    const r2Object = await c.env.R2_STORAGE.get(
      `${payload.sessionId}/${fileId}`,
    )
    if (!r2Object) {
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'File not found in storage',
        },
        404,
      )
    }

    // Use filename from query param if provided, otherwise use original filename
    const downloadFilename = filenameFromQuery || result.files.originalFilename

    logger.info('File downloaded', {
      fileId,
      sessionId: payload.sessionId,
      filename: downloadFilename,
    })

    // Return file
    return new Response(r2Object.body, {
      headers: {
        'Content-Type': result.files.mimeType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': String(result.files.fileSize),
      },
    })
  },
)

import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { files, sessions } from '@/database/schema'
import {
  createChestJWT,
  retrievalCodeParamSchema,
  useDrizzle,
  withNotDeleted,
} from '@/lib'
import type { ApiResponse, CloudflareEnv, RetrieveChestResponse } from '@/types'

export const retrieveRoutes = new Hono<{ Bindings: CloudflareEnv }>()

// GET /retrieve/:retrievalCode - Retrieve chest contents
retrieveRoutes.get(
  '/retrieve/:retrievalCode',
  zValidator('param', retrievalCodeParamSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const db = useDrizzle(c)

    try {
      const { retrievalCode } = c.req.valid('param')

      // Find session
      const session = await db
        ?.select()
        .from(sessions)
        .where(
          withNotDeleted(
            sessions,
            and(
              eq(sessions.retrievalCode, retrievalCode),
              eq(sessions.uploadComplete, 1),
            ),
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

      // Check if expired
      if (session.expiresAt && session.expiresAt < new Date()) {
        return c.json<ApiResponse>(
          {
            code: 404,
            message: 'Retrieval code expired',
          },
          404,
        )
      }

      // Get all files
      const sessionFiles = await db
        ?.select()
        .from(files)
        .where(withNotDeleted(files, eq(files.sessionId, session.id)))
        .orderBy(files.createdAt)

      if (!sessionFiles || sessionFiles.length === 0) {
        return c.json<ApiResponse>(
          {
            code: 404,
            message: 'No files found for this session',
          },
          404,
        )
      }

      // Create chest JWT
      const chestToken = await createChestJWT(
        session.id,
        session.expiresAt,
        c.env.JWT_SECRET,
      )

      logger.info('Chest retrieved', {
        retrievalCode,
        sessionId: session.id,
        fileCount: sessionFiles.length,
      })

      return c.json<ApiResponse<RetrieveChestResponse>>({
        code: 0,
        message: 'ok',
        data: {
          files: sessionFiles.map((file) => ({
            fileId: file.id,
            filename: file.originalFilename,
            size: file.fileSize,
            mimeType: file.mimeType,
            isText: Boolean(file.isText),
            fileExtension: file.fileExtension,
          })),
          chestToken,
          expiryDate: session.expiresAt?.toISOString() || null,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Failed to retrieve chest, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to retrieve chest'
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

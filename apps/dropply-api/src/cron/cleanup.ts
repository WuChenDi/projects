import { and, eq, lt } from 'drizzle-orm'
import { files, sessions } from '@/database/schema'
import { useDrizzle, withNotDeleted } from '@/lib'
import type { CloudflareEnv } from '@/types'

export interface CleanupResult {
  expiredSessions: number
  deletedFiles: number
  r2ObjectsDeleted: number
  incompleteSessions: number
  errors: string[]
}

export async function cleanupExpiredContent(
  env: CloudflareEnv,
): Promise<CleanupResult> {
  // Create a mock context for database initialization
  // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
  const db = useDrizzle({ env } as any)

  const currentTime = new Date()
  const errors: string[] = []
  let expiredSessions = 0
  let deletedFiles = 0
  let r2ObjectsDeleted = 0
  let incompleteSessions = 0

  logger.info('Starting scheduled cleanup job', {
    timestamp: currentTime.toISOString(),
  })

  try {
    if (!db) {
      throw new Error('Database connection failed')
    }

    // 1. Find expired sessions (permanent sessions with expiresAt = NULL are excluded)
    const expiredSessionsResult = await db
      ?.select()
      .from(sessions)
      .where(withNotDeleted(sessions, lt(sessions.expiresAt, currentTime)))

    if (!expiredSessionsResult) {
      errors.push('Failed to query expired sessions')
      return {
        expiredSessions: 0,
        deletedFiles: 0,
        r2ObjectsDeleted: 0,
        incompleteSessions: 0,
        errors,
      }
    }

    logger.info(`Found ${expiredSessionsResult.length} expired sessions`)

    // 2. Find incomplete sessions created 48 hours ago (matching shard JWT validity period)
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const incompleteSessionsResult = await db
      ?.select()
      .from(sessions)
      .where(
        withNotDeleted(
          sessions,
          and(
            eq(sessions.uploadComplete, 0),
            lt(sessions.createdAt, cutoffTime),
          ),
        ),
      )

    if (!incompleteSessionsResult) {
      errors.push('Failed to query incomplete sessions')
      return {
        expiredSessions: 0,
        deletedFiles: 0,
        r2ObjectsDeleted: 0,
        incompleteSessions: 0,
        errors,
      }
    }

    logger.info(
      `Found ${incompleteSessionsResult.length} incomplete sessions (>48h old)`,
    )

    // Merge expired and incomplete sessions for cleanup
    const allSessionsToCleanup = [
      ...expiredSessionsResult.map((s) => ({ id: s.id, reason: 'expired' })),
      ...incompleteSessionsResult.map((s) => ({
        id: s.id,
        reason: 'incomplete',
      })),
    ]

    logger.info(`Total sessions to cleanup: ${allSessionsToCleanup.length}`)

    // Process each session
    for (const session of allSessionsToCleanup) {
      const sessionId = session.id
      const reason = session.reason

      try {
        // 3. Get file count for logging
        const sessionFiles = await db
          ?.select()
          .from(files)
          .where(withNotDeleted(files, eq(files.sessionId, sessionId)))

        if (!sessionFiles) {
          errors.push(`Failed to query files for session ${sessionId}`)
          continue
        }

        const fileCount = sessionFiles.length
        logger.info(`Session ${sessionId} (${reason}) has ${fileCount} files`)

        // 4. Delete all objects in R2
        try {
          const listResult = await env.R2_STORAGE.list({
            prefix: `${sessionId}/`,
          })

          if (listResult.objects.length > 0) {
            const deletePromises = listResult.objects.map((obj) =>
              env.R2_STORAGE.delete(obj.key),
            )
            await Promise.all(deletePromises)
            r2ObjectsDeleted += listResult.objects.length
            logger.info(
              `Deleted ${listResult.objects.length} R2 objects for session ${sessionId}`,
            )
          }
        } catch (error) {
          errors.push(
            `Failed to delete R2 objects for session ${sessionId}: ${error}`,
          )
        }

        // 5. Soft delete database records (delete files first, then session)
        const filesUpdateResult = await db
          ?.update(files)
          .set({
            isDeleted: 1,
            updatedAt: new Date(),
          })
          .where(withNotDeleted(files, eq(files.sessionId, sessionId)))

        if (!filesUpdateResult) {
          errors.push(`Failed to update files for session ${sessionId}`)
          continue
        }

        deletedFiles += fileCount

        const sessionUpdateResult = await db
          ?.update(sessions)
          .set({
            isDeleted: 1,
            updatedAt: new Date(),
          })
          .where(withNotDeleted(sessions, eq(sessions.id, sessionId)))

        if (!sessionUpdateResult) {
          errors.push(`Failed to update session ${sessionId}`)
          continue
        }

        if (reason === 'expired') {
          expiredSessions++
        } else {
          incompleteSessions++
        }

        logger.info(
          `Cleaned up session ${sessionId} (${reason}) with ${fileCount} files`,
        )
      } catch (error) {
        errors.push(`Failed to cleanup session ${sessionId}: ${error}`)
        logger.error(`Error cleaning session ${sessionId}`, { error })
      }
    }

    logger.info('Cleanup summary', {
      totalSessions: expiredSessions + incompleteSessions,
      expiredSessions,
      incompleteSessions,
      deletedFiles,
      r2ObjectsDeleted,
    })
  } catch (error) {
    errors.push(`Database query failed: ${error}`)
    logger.error('Database error during cleanup', { error })
  }

  return {
    expiredSessions,
    deletedFiles,
    r2ObjectsDeleted,
    incompleteSessions,
    errors,
  }
}

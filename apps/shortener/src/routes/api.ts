import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { links } from '@/database/schema'
import { softDelete, useDrizzle, withNotDeleted } from '@/lib'
import type {
  ApiResponse,
  BatchOperationResponse,
  CloudflareEnv,
  CreateUrlRecord,
  UrlData,
  Variables,
} from '@/types'
import {
  createUrlRequestSchema,
  deleteUrlRequestSchema,
  generateHashFromDomainAndCode,
  generateRandomHash,
  getDefaultExpiresAt,
  isDeletedQuerySchema,
  updateUrlRequestSchema,
} from '@/utils'

const HASH_MAX_RETRIES = 15
const CACHE_TTL_SECONDS = 60 * 60 // 1 hour

export const apiRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

async function deleteUrlCache(env: CloudflareEnv, hash: string) {
  if (!env.SHORTENER_KV) return
  try {
    await Promise.all([
      env.SHORTENER_KV.delete(`url:${hash}`),
      env.SHORTENER_KV.delete(`og:${hash}`),
    ])
  } catch (error) {
    logger.warn(
      `KV cache delete failed for ${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

async function findExistingHash(
  db: ReturnType<typeof useDrizzle>,
  hash: string,
) {
  return db.select().from(links).where(eq(links.hash, hash)).get()
}

/** Resolve a unique `(shortCode, hash)` pair, honoring user-supplied codes. */
async function generateUniqueHash(
  db: ReturnType<typeof useDrizzle>,
  record: CreateUrlRecord,
  domain: string,
): Promise<{ shortCode: string; hash: string }> {
  if (record.hash) {
    const hash = generateHashFromDomainAndCode(domain, record.hash)
    if (await findExistingHash(db, hash)) {
      throw new Error(
        `Custom short code "${record.hash}" already exists for domain ${domain}`,
      )
    }
    return { shortCode: record.hash, hash }
  }

  for (let attempt = 1; attempt <= HASH_MAX_RETRIES; attempt++) {
    // Grow the code length on retry to escape collision hot-spots.
    const length = attempt <= 5 ? 8 : attempt <= 10 ? 9 : 10
    const shortCode = generateRandomHash(length)
    const hash = generateHashFromDomainAndCode(domain, shortCode)

    if (!(await findExistingHash(db, hash))) {
      logger.debug(`Generated unique hash on attempt ${attempt}: ${shortCode}`)
      return { shortCode, hash }
    }
    logger.debug(`Hash collision on attempt ${attempt}: ${shortCode}`)
  }

  throw new Error(
    `Failed to generate unique hash after ${HASH_MAX_RETRIES} attempts`,
  )
}

// GET /api/url
apiRoutes.get('/url', zValidator('query', isDeletedQuerySchema), async (c) => {
  const { isDeleted } = c.req.valid('query')
  const filterValue = isDeleted ?? 0
  const requestId = c.get('requestId')

  logger.info(
    `[${requestId}] GET /api/url - Fetching URLs with isDeleted=${filterValue}`,
  )

  const db = useDrizzle(c)
  const allLinks = await db
    .select()
    .from(links)
    .where(eq(links.isDeleted, filterValue))

  logger.info(`Retrieved ${allLinks.length} links from database`)
  return c.json<ApiResponse<typeof allLinks>>({
    code: 0,
    message: 'ok',
    data: allLinks,
  })
})

// POST /api/url
apiRoutes.post(
  '/url',
  zValidator('json', createUrlRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const { records } = c.req.valid('json')
    const db = useDrizzle(c)
    const domain = new URL(c.req.url).hostname

    logger.info(
      `[${requestId}] POST /api/url - Creating ${records.length} records on ${domain}`,
    )

    const results = await Promise.all(
      records.map(async (record) => {
        try {
          const { shortCode, hash } = await generateUniqueHash(
            db,
            record,
            domain,
          )
          const expiresAt = record.expiresAt || getDefaultExpiresAt()

          const inserted = await db
            .insert(links)
            .values({
              url: record.url,
              userId: record.userId || '',
              expiresAt,
              hash,
              shortCode,
              domain,
              attribute: record.attribute,
            })
            .returning()
            .get()

          if (c.env.SHORTENER_KV && inserted) {
            const cacheData: UrlData = {
              id: inserted.id,
              url: record.url,
              userId: record.userId || '',
              expiresAt,
              hash,
              shortCode,
              domain,
              attribute: record.attribute,
              createdAt: new Date(),
              updatedAt: new Date(),
              isDeleted: 0,
            }
            try {
              await c.env.SHORTENER_KV.put(
                `url:${hash}`,
                JSON.stringify(cacheData),
                { expirationTtl: CACHE_TTL_SECONDS },
              )
            } catch (error) {
              logger.warn(
                `KV cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              )
            }
          }

          return {
            success: true,
            hash,
            shortCode,
            shortUrl: `https://${domain}/${shortCode}`,
            url: record.url,
            expiresAt,
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown creation error'
          logger.error(
            `Failed to create link for URL: ${record.url}, error: ${message}`,
          )
          return {
            success: false,
            hash: record.hash || 'unknown',
            url: record.url,
            error: message,
          }
        }
      }),
    )

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)
    logger.info(
      `URL creation completed - successes=${successes.length}, failures=${failures.length}`,
    )

    return c.json<ApiResponse<BatchOperationResponse>>({
      code: 0,
      message: 'ok',
      data: { successes, failures },
    })
  },
)

// PUT /api/url
apiRoutes.put('/url', zValidator('json', updateUrlRequestSchema), async (c) => {
  const requestId = c.get('requestId')
  const { records } = c.req.valid('json')
  const db = useDrizzle(c)

  logger.info(
    `[${requestId}] PUT /api/url - Updating ${records.length} records`,
  )

  const results = await Promise.all(
    records.map(async (record) => {
      try {
        const existing = await db
          .select()
          .from(links)
          .where(withNotDeleted(links, eq(links.hash, record.hash)))
          .get()

        if (!existing) {
          return {
            success: false,
            hash: record.hash,
            error: 'Record not found or already deleted',
          }
        }

        const fieldsToUpdate = Object.fromEntries(
          Object.entries({
            url: record.url,
            userId: record.userId,
            expiresAt: record.expiresAt,
            attribute: record.attribute,
          }).filter(([, v]) => v !== undefined),
        )

        if (Object.keys(fieldsToUpdate).length === 0) {
          return {
            success: false,
            hash: record.hash,
            error: 'No fields to update',
          }
        }

        await db
          .update(links)
          .set(fieldsToUpdate)
          .where(withNotDeleted(links, eq(links.hash, record.hash)))
          .execute()

        await deleteUrlCache(c.env, record.hash)
        return { success: true, hash: record.hash }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown update error'
        logger.error(`Update failed for ${record.hash}: ${message}`)
        return { success: false, hash: record.hash, error: message }
      }
    }),
  )

  const successes = results.filter((r) => r.success)
  const failures = results.filter((r) => !r.success)
  logger.info(
    `URL update completed - successes=${successes.length}, failures=${failures.length}`,
  )

  return c.json<ApiResponse<BatchOperationResponse>>({
    code: 0,
    message: 'ok',
    data: { successes, failures },
  })
})

// DELETE /api/url
apiRoutes.delete(
  '/url',
  zValidator('json', deleteUrlRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    const { hashList } = c.req.valid('json')
    const db = useDrizzle(c)

    logger.info(
      `[${requestId}] DELETE /api/url - Soft deleting ${hashList.length} records`,
    )

    const results = await Promise.all(
      hashList.map(async (hash) => {
        try {
          const record = await db
            .select()
            .from(links)
            .where(withNotDeleted(links, eq(links.hash, hash)))
            .get()

          if (!record) {
            return {
              success: false,
              hash,
              error: 'Record not found or already deleted',
            }
          }

          await db
            .update(links)
            .set(softDelete())
            .where(eq(links.hash, hash))
            .execute()

          await deleteUrlCache(c.env, hash)
          return { success: true, hash }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown deletion error'
          logger.error(`Delete failed for ${hash}: ${message}`)
          return { success: false, hash, error: message }
        }
      }),
    )

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)
    logger.info(
      `URL deletion completed - successes=${successes.length}, failures=${failures.length}`,
    )

    return c.json<ApiResponse<BatchOperationResponse>>({
      code: 0,
      message: 'ok',
      data: { successes, failures },
    })
  },
)

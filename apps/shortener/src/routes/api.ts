import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { links } from '@/database/schema'
import { softDelete, useDrizzle, withNotDeleted } from '@/lib'
import type {
  ApiResponse,
  BatchOperationResponse,
  CloudflareEnv,
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

export const apiRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

// POST /api/page
apiRoutes.post('/page', async (c) => {
  const requestId = c.get('requestId')

  logger.info(`[${requestId}] POST /api/page - Creating page`)

  try {
    const db = useDrizzle(c)
    logger.debug('Database connection established for page creation')

    return c.json<ApiResponse<{ db: boolean }>>({
      code: 0,
      message: 'ok',
      data: {
        db: !!db,
      },
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error in POST /api/page, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )

    return c.json<ApiResponse>(
      {
        code: 500,
        message:
          error instanceof Error ? error.message : 'Internal Server Error',
      },
      500,
    )
  }
})

// GET /api/url
apiRoutes.get('/url', zValidator('query', isDeletedQuerySchema), async (c) => {
  const { isDeleted } = c.req.valid('query')
  const requestId = c.get('requestId')

  // By default, query undeleted links (isDeleted = 0)
  const filterValue = isDeleted ?? 0

  logger.info(
    `[${requestId}] GET /api/url - Fetching URLs with isDeleted filter: ${filterValue}`,
  )

  try {
    const db = useDrizzle(c)
    logger.debug('Database connection established for URL retrieval')

    logger.debug(`Querying links with isDeleted = ${filterValue}`)
    const allLinks = await db
      ?.select()
      .from(links)
      .where(eq(links.isDeleted, filterValue))

    logger.info(`Retrieved ${allLinks?.length || 0} links from database`)
    logger.debug(`Retrieved links data: ${JSON.stringify(allLinks)}`)

    return c.json<ApiResponse<typeof allLinks>>({
      code: 0,
      message: 'ok',
      data: allLinks || [],
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error retrieving URLs from database, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error'

    return c.json<ApiResponse<[]>>(
      {
        code: 500,
        message: errorMessage,
        data: [],
      },
      500,
    )
  }
})

// POST /api/url
apiRoutes.post(
  '/url',
  zValidator('json', createUrlRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    logger.info(
      `[${requestId}] POST /api/url - Creating new URLs with optimized hash collision handling`,
    )

    try {
      const db = useDrizzle(c)
      const { records } = c.req.valid('json')

      const url = new URL(c.req.url)
      const domain = url.hostname

      logger.info(`Processing ${records.length} URL records for creation`)

      // Optimized hash generation function with enhanced collision detection
      async function generateUniqueHash(
        record: any,
        domain: string,
        maxRetries: number = 15,
      ): Promise<{ shortCode: string; hash: string }> {
        // Prioritize user-provided custom short code
        if (record.hash) {
          const hash = generateHashFromDomainAndCode(domain, record.hash)
          const existing = await db
            ?.select()
            .from(links)
            .where(eq(links.hash, hash))
            .get()

          if (existing) {
            throw new Error(
              `Custom short code "${record.hash}" already exists for domain ${domain}`,
            )
          }

          return { shortCode: record.hash, hash }
        }

        // Generate random short code with enhanced collision detection
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          // Gradually increase short code length as retry count increases to reduce collision probability
          const length = attempt <= 5 ? 8 : attempt <= 10 ? 9 : 10
          const shortCode = generateRandomHash(length)
          const hash = generateHashFromDomainAndCode(domain, shortCode)

          // Check if hash exists in database
          const existing = await db
            ?.select()
            .from(links)
            .where(eq(links.hash, hash))
            .get()

          if (!existing) {
            logger.debug(
              `Generated unique hash on attempt ${attempt}: ${shortCode}`,
            )
            return { shortCode, hash }
          }

          logger.debug(
            `Hash collision detected on attempt ${attempt}: ${shortCode}, retrying...`,
          )

          // Add random delay after multiple retries to avoid hotspot conflicts
          if (attempt > 5) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 10),
            )
          }
        }

        throw new Error(
          `Failed to generate unique hash after ${maxRetries} attempts`,
        )
      }

      // Batch process records
      const results = await Promise.all(
        records.map(async (record, index) => {
          logger.debug(`Processing record ${index + 1}/${records.length}`)

          try {
            // Generate unique hash
            const { shortCode, hash } = await generateUniqueHash(record, domain)

            const expiresAt = record.expiresAt || getDefaultExpiresAt()

            // Insert into database
            const insertedRecord = await db
              ?.insert(links)
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

            // Cache the newly created URL
            if (c.env.SHORTENER_KV) {
              try {
                const cacheKey = `url:${hash}`
                const cacheData: UrlData = {
                  url: record.url,
                  hash,
                  shortCode,
                  domain,
                  expiresAt,
                  userId: record.userId || '',
                  attribute: record.attribute,
                  id: insertedRecord?.id || 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isDeleted: 0,
                }
                await c.env.SHORTENER_KV.put(
                  cacheKey,
                  JSON.stringify(cacheData),
                  {
                    expirationTtl: 3600, // Cache for 1 hour
                  },
                )
                logger.debug(`Cached new URL for shortCode: ${shortCode}`)
              } catch (cacheError) {
                logger.warn(
                  `Cache write error during URL creation, ${JSON.stringify({
                    error:
                      cacheError instanceof Error
                        ? cacheError.message
                        : 'Unknown error',
                  })}`,
                )
              }
            }

            logger.debug(
              `Successfully created link: ${shortCode} -> ${record.url}`,
            )
            return {
              hash: hash,
              shortCode: shortCode,
              shortUrl: `https://${domain}/${shortCode}`,
              success: true,
              url: record.url,
              expiresAt,
            }
          } catch (error) {
            logger.error(
              `Failed to create link for URL: ${record.url}, ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              })}`,
            )
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown creation error'
            return {
              hash: record.hash || 'unknown',
              success: false,
              error: errorMessage,
              url: record.url,
            }
          }
        }),
      )

      const successes = results.filter((result) => result.success)
      const failures = results.filter((result) => !result.success)

      logger.info(
        `URL creation completed - Successes: ${successes.length}, Failures: ${failures.length}`,
      )

      // Log failure details for debugging
      if (failures.length > 0) {
        logger.warn(
          `URL creation failures: ${JSON.stringify(
            failures.map((f) => ({
              url: f.url,
              hash: f.hash,
              error: f.error,
            })),
          )}`,
        )
      }

      return c.json<ApiResponse<BatchOperationResponse>>({
        code: 0,
        message: 'ok',
        data: {
          successes,
          failures,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Error in URL creation process, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      const errorMessage =
        error instanceof Error ? error.message : 'Internal Server Error'

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

// PUT /api/url
apiRoutes.put('/url', zValidator('json', updateUrlRequestSchema), async (c) => {
  const requestId = c.get('requestId')
  logger.info(`[${requestId}] PUT /api/url - Updating URLs`)

  try {
    const db = useDrizzle(c)
    const { records } = c.req.valid('json')

    logger.info(`Processing ${records.length} URL records for update`)

    const results = await Promise.all(
      records.map(async (record, index) => {
        logger.debug(
          `Processing update for record ${index + 1}/${records.length} - hash: ${record.hash}`,
        )

        try {
          const existingRecord = await db
            ?.select()
            .from(links)
            .where(withNotDeleted(links, eq(links.hash, record.hash)))
            .get()

          if (!existingRecord) {
            logger.warn(
              `Record not found or already deleted for hash: ${record.hash}`,
            )
            return {
              hash: record.hash,
              success: false,
              error: 'Record not found or already deleted',
            }
          }

          const updateData = {
            url: record.url,
            userId: record.userId,
            expiresAt: record.expiresAt,
            attribute: record.attribute,
          }

          const fieldsToUpdate = Object.fromEntries(
            Object.entries(updateData).filter(
              ([, value]) => value !== undefined,
            ),
          )

          if (Object.keys(fieldsToUpdate).length > 0) {
            logger.debug(
              `Updating fields for hash ${record.hash}: ${Object.keys(fieldsToUpdate)}`,
            )

            await db
              ?.update(links)
              .set(fieldsToUpdate)
              .where(withNotDeleted(links, eq(links.hash, record.hash)))
              .execute()

            // Update cache
            if (c.env.SHORTENER_KV) {
              try {
                const cacheKey = `url:${record.hash}`
                // Clear old cache so that the next access fetches the latest data from the database
                await c.env.SHORTENER_KV.delete(cacheKey)
                logger.debug(`Cleared cache for updated hash: ${record.hash}`)
              } catch (cacheError) {
                logger.warn(
                  `Cache clear error during URL update, ${JSON.stringify({
                    error:
                      cacheError instanceof Error
                        ? cacheError.message
                        : 'Unknown error',
                  })}`,
                )
              }
            }

            logger.debug(`Successfully updated link with hash: ${record.hash}`)
            return {
              hash: record.hash,
              success: true,
            }
          }

          logger.warn(`No fields to update for hash: ${record.hash}`)
          return {
            hash: record.hash,
            success: false,
            error: 'No fields to update',
          }
        } catch (error) {
          logger.error(
            `Error updating record with hash ${record.hash}, ${JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            })}`,
          )
          return {
            hash: record.hash,
            success: false,
            error:
              error instanceof Error ? error.message : 'Unknown update error',
          }
        }
      }),
    )

    const successes = results.filter((result) => result.success)
    const failures = results.filter((result) => !result.success)

    logger.info(
      `URL update completed - Successes: ${successes.length}, Failures: ${failures.length}`,
    )

    if (failures.length > 0) {
      logger.warn(
        `Some URL updates failed: ${JSON.stringify(failures.map((f) => ({ hash: f.hash, error: f.error })))}`,
      )
    }

    return c.json<ApiResponse<BatchOperationResponse>>({
      code: 0,
      message: 'ok',
      data: {
        successes,
        failures,
      },
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error in URL update process, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error'

    return c.json<ApiResponse>(
      {
        code: 500,
        message: errorMessage,
      },
      500,
    )
  }
})

// DELETE /api/url
apiRoutes.delete(
  '/url',
  zValidator('json', deleteUrlRequestSchema),
  async (c) => {
    const requestId = c.get('requestId')
    logger.info(`[${requestId}] DELETE /api/url - Soft deleting URLs`)

    try {
      const db = useDrizzle(c)
      const { hashList } = c.req.valid('json')

      logger.info(`Processing ${hashList.length} URLs for soft deletion`)
      logger.debug(`Hash list for deletion: ${JSON.stringify(hashList)}`)

      const results = await Promise.all(
        hashList.map(async (hash, index) => {
          logger.debug(
            `Processing deletion ${index + 1}/${hashList.length} - hash: ${hash}`,
          )

          try {
            const record = await db
              ?.select()
              .from(links)
              .where(withNotDeleted(links, eq(links.hash, hash)))
              .get()

            if (record) {
              await db
                ?.update(links)
                .set(softDelete())
                .where(eq(links.hash, hash))
                .execute()

              // Clear cache
              if (c.env.SHORTENER_KV) {
                try {
                  const cacheKey = `url:${hash}`
                  const ogCacheKey = `og:${hash}`
                  await c.env.SHORTENER_KV.delete(cacheKey)
                  await c.env.SHORTENER_KV.delete(ogCacheKey)
                  logger.debug(`Cleared cache for deleted hash: ${hash}`)
                } catch (cacheError) {
                  logger.warn(
                    `Cache clear error during URL deletion, ${JSON.stringify({
                      error:
                        cacheError instanceof Error
                          ? cacheError.message
                          : 'Unknown error',
                    })}`,
                  )
                }
              }

              logger.debug(`Successfully soft deleted link with hash: ${hash}`)
              return {
                hash,
                success: true,
              }
            } else {
              logger.warn(
                `Record not found or already deleted for hash: ${hash}`,
              )
              return {
                hash,
                success: false,
                error: 'Record not found or already deleted',
              }
            }
          } catch (error) {
            logger.error(
              `Error soft deleting record with hash ${hash}, ${JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              })}`,
            )
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown deletion error'
            return {
              hash,
              success: false,
              error: errorMessage,
            }
          }
        }),
      )

      const successes = results.filter((result) => result.success)
      const failures = results.filter((result) => !result.success)

      logger.info(
        `URL deletion completed - Successes: ${successes.length}, Failures: ${failures.length}`,
      )

      if (failures.length > 0) {
        logger.warn(
          `Some URL deletions failed: ${JSON.stringify(failures.map((f) => ({ hash: f.hash, error: f.error })))}`,
        )
      }

      return c.json<ApiResponse<BatchOperationResponse>>({
        code: 0,
        message: 'ok',
        data: {
          successes,
          failures,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Error in URL deletion process, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      const errorMessage =
        error instanceof Error ? error.message : 'Internal Server Error'

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

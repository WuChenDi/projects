import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type {
  AIBatchResult,
  AISlugResponse,
  ApiResponse,
  CloudflareEnv,
  Variables,
} from '@/types'
import {
  batchSlugSchema,
  generateAISlug,
  getAIConfig,
  slugSchema,
  suggestionsSchema,
} from '@/utils'

export const aiRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

function ensureAIEnabled(env: CloudflareEnv) {
  if (!getAIConfig(env).ENABLE_AI_SLUG) {
    throw new HTTPException(503, {
      message: 'AI service is not available or disabled',
    })
  }
}

// GET /api/ai/slug
aiRoutes.get('/slug', zValidator('query', slugSchema), async (c) => {
  const { url, cache } = c.req.valid('query')
  const requestId = c.get('requestId')
  ensureAIEnabled(c.env)

  logger.info(`[${requestId}] AI slug generation requested, url: ${url}`)

  const result = await generateAISlug(c, url, { cache })
  logger.info(
    `[${requestId}] AI slug generated, ${JSON.stringify({
      url,
      slug: result.slug,
      method: result.method,
      confidence: result.confidence,
    })}`,
  )

  return c.json<ApiResponse<AISlugResponse>>({
    code: 0,
    message: 'success',
    data: result,
  })
})

// POST /api/ai/batch-slug
aiRoutes.post('/batch-slug', zValidator('json', batchSlugSchema), async (c) => {
  const { urls, cache } = c.req.valid('json')
  const requestId = c.get('requestId')
  ensureAIEnabled(c.env)

  logger.info(
    `[${requestId}] Batch AI slug generation requested, urlCount: ${urls.length}`,
  )

  const settled = await Promise.allSettled(
    urls.map((url) => generateAISlug(c, url, { cache })),
  )

  const results: AIBatchResult[] = settled.map((r, i) => ({
    url: urls[i]!,
    result: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? (r.reason as Error).message : null,
  }))

  const successCount = results.filter((r) => r.result?.success).length
  logger.info(
    `[${requestId}] Batch AI slug generation completed, ${JSON.stringify({
      total: urls.length,
      success: successCount,
      failed: urls.length - successCount,
    })}`,
  )

  return c.json<ApiResponse>({
    code: 0,
    message: 'success',
    data: {
      results,
      summary: {
        total: urls.length,
        success: successCount,
        failed: urls.length - successCount,
      },
    },
  })
})

// GET /api/ai/suggestions
aiRoutes.get(
  '/suggestions',
  zValidator('query', suggestionsSchema),
  async (c) => {
    const { url, count } = c.req.valid('query')
    const requestId = c.get('requestId')
    ensureAIEnabled(c.env)

    logger.info(
      `[${requestId}] AI suggestions requested, url: ${url}, count: ${count}`,
    )

    const settled = await Promise.allSettled(
      Array.from({ length: count }, () =>
        generateAISlug(c, url, { cache: false }),
      ),
    )

    const suggestions = settled
      .filter(
        (r): r is PromiseFulfilledResult<AISlugResponse> =>
          r.status === 'fulfilled' && r.value.success,
      )
      .map((r) => r.value)

    // Dedupe by slug, then prefer higher confidence.
    const unique = Array.from(
      new Map(suggestions.map((s) => [s.slug, s])).values(),
    ).sort((a, b) => b.confidence - a.confidence)

    logger.info(
      `[${requestId}] AI suggestions generated, ${JSON.stringify({
        url,
        requestedCount: count,
        generatedCount: unique.length,
      })}`,
    )

    return c.json<ApiResponse>({
      code: 0,
      message: 'success',
      data: { url, suggestions: unique },
    })
  },
)

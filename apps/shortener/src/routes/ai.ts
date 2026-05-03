import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
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

// GET /api/ai/slug
aiRoutes.get('/slug', zValidator('query', slugSchema), async (c) => {
  const { url, cache } = c.req.valid('query')
  const requestId = c.get('requestId')
  const aiConfig = getAIConfig(c.env)

  logger.info(`[${requestId}] AI slug generation requested, url: ${url}`)

  // Check if AI is enabled using environment variables
  if (!aiConfig.ENABLE_AI_SLUG) {
    logger.warn(
      `[${requestId}] AI service disabled, ${JSON.stringify({
        ENABLE_AI_SLUG: aiConfig.ENABLE_AI_SLUG,
        AI_MODEL: aiConfig.AI_MODEL,
      })}`,
    )

    return c.json<ApiResponse>(
      {
        code: 503,
        message: 'AI service is not available or disabled',
      },
      503,
    )
  }

  try {
    const result = await generateAISlug(c, url, {
      cache,
    })

    logger.info(
      `[${requestId}] AI slug generated, ${JSON.stringify({
        url,
        slug: result.slug,
        success: result.success,
        method: result.method,
        confidence: result.confidence,
      })}`,
    )

    return c.json<ApiResponse<AISlugResponse>>({
      code: 0,
      message: 'success',
      data: result,
    })
  } catch (error) {
    logger.error(
      `[${requestId}] AI slug generation failed, ${JSON.stringify({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )

    return c.json<ApiResponse>(
      {
        code: 500,
        message: 'AI slug generation failed',
      },
      500,
    )
  }
})

// POST /api/ai/batch-slug
aiRoutes.post('/batch-slug', zValidator('json', batchSlugSchema), async (c) => {
  const { urls, cache } = c.req.valid('json')
  const requestId = c.get('requestId')
  const aiConfig = getAIConfig(c.env)

  const timeout = urls.length * aiConfig.AI_TIMEOUT

  logger.info(
    `[${requestId}] Batch AI slug generation requested, ${JSON.stringify({
      urlCount: urls.length,
      timeout,
    })}`,
  )

  if (!aiConfig.ENABLE_AI_SLUG) {
    logger.warn(`[${requestId}] AI service disabled for batch operation`)

    return c.json<ApiResponse>(
      {
        code: 503,
        message: 'AI service is not available or disabled',
      },
      503,
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const results = await Promise.allSettled(
      urls.map((url) =>
        generateAISlug(c, url, {
          cache,
        }),
      ),
    )
    clearTimeout(timeoutId)

    const processedResults: AIBatchResult[] = results.map((result, index) => ({
      url: urls[index]!,
      result: result.status === 'fulfilled' ? result.value : null,
      error:
        result.status === 'rejected' ? (result.reason as Error).message : null,
    }))

    const successCount = processedResults.filter(
      (r) => r.result?.success,
    ).length

    logger.info(
      `[${requestId}] Batch AI slug generation completed, ${JSON.stringify({
        total: urls.length,
        success: successCount,
        failed: urls.length - successCount,
        executionTime: `${timeout}ms`,
      })}`,
    )

    return c.json<ApiResponse>({
      code: 0,
      message: 'success',
      data: {
        results: processedResults,
        summary: {
          total: urls.length,
          success: successCount,
          failed: urls.length - successCount,
        },
      },
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Batch AI slug generation failed, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    return c.json<ApiResponse>(
      {
        code: 500,
        message: 'Batch AI slug generation failed',
      },
      500,
    )
  }
})

// GET /api/ai/suggestions
aiRoutes.get(
  '/suggestions',
  zValidator('query', suggestionsSchema),
  async (c) => {
    const { url, count } = c.req.valid('query')
    const requestId = c.get('requestId')
    const aiConfig = getAIConfig(c.env)

    logger.info(
      `[${requestId}] AI suggestions requested, ${JSON.stringify({
        url,
        count,
      })}`,
    )

    if (!aiConfig.ENABLE_AI_SLUG) {
      logger.warn(`[${requestId}] AI service disabled for suggestions`)

      return c.json<ApiResponse>(
        {
          code: 503,
          message: 'AI service is not available',
        },
        503,
      )
    }

    try {
      // Generate multiple candidates (parallel execution)
      const promises = Array(count)
        .fill(null)
        .map(() => generateAISlug(c, url, { cache: false }))

      const results = await Promise.allSettled(promises)
      const suggestions = results
        .filter(
          (result): result is PromiseFulfilledResult<AISlugResponse> =>
            result.status === 'fulfilled' && result.value.success,
        )
        .map((result) => result.value)

      // Remove duplicates
      const uniqueSuggestions = Array.from(
        new Map(suggestions.map((s) => [s.slug, s])).values(),
      ).sort((a, b) => b.confidence - a.confidence)

      logger.info(
        `[${requestId}] AI suggestions generated, ${JSON.stringify({
          url,
          requestedCount: count,
          generatedCount: uniqueSuggestions.length,
        })}`,
      )

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: {
          url,
          suggestions: uniqueSuggestions,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] AI suggestions failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'AI suggestions generation failed',
        },
        500,
      )
    }
  },
)

import type { Context } from 'hono'
import type { AIConfiguration, AISlugResponse, CloudflareEnv } from '@/types'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

/**
 * Get AI configuration from environment variables with fallback defaults
 * @param env CloudflareEnv environment variables
 * @returns AI configuration object
 */
export function getAIConfig(env: CloudflareEnv): AIConfiguration {
  // Check if AI is enabled: both flag must be true AND model must be configured
  const aiEnabled =
    env.ENABLE_AI_SLUG === 'true' && Boolean(env.AI_MODEL?.trim())

  return {
    systemPrompt: `You are a URL-to-slug converter specialist. Generate short, meaningful slugs for URLs.

  RULES:
  1. Use only lowercase letters, numbers, and hyphens
  2. Maximum 20 characters, minimum 3 characters
  3. No leading/trailing hyphens
  4. Be descriptive but concise
  5. Remove common words (the, and, or, of, in, on, at, etc.)
  6. Use hyphens to separate words
  7. Return ONLY JSON format: {"slug": "example"}

  EXAMPLES:
  - GitHub repos: use repo name
  - Documentation: use service name + "docs"  
  - Blog posts: use key topic words
  - Company sites: use company name
  - API docs: use service + "api"

  SLUG PATTERN: ${SLUG_REGEX.toString()}`,

    examples: [
      { role: 'user', content: 'https://www.cloudflare.com/' },
      { role: 'assistant', content: '{"slug": "cloudflare"}' },

      { role: 'user', content: 'https://github.com/vercel/next.js' },
      { role: 'assistant', content: '{"slug": "nextjs"}' },

      { role: 'user', content: 'https://github.com/WuChenDi' },
      { role: 'assistant', content: '{"slug": "WuChenDi"}' },

      { role: 'user', content: 'https://github.com/cdLab996' },
      { role: 'assistant', content: '{"slug": "cdlab996"}' },

      {
        role: 'user',
        content: 'https://notes-wudi.pages.dev',
      },
      { role: 'assistant', content: '{"slug": "notes-wudi"}' },

      { role: 'user', content: 'https://clearify.pages.dev' },
      { role: 'assistant', content: '{"slug": "clearify"}' },

      { role: 'user', content: 'https://t.me/cdlab996' },
      { role: 'assistant', content: '{"slug": "tg-cdlab996"}' },

      { role: 'user', content: 'https://shortener.cdlab.workers.dev' },
      { role: 'assistant', content: '{"slug": "shortener"}' },
    ],

    // AI configuration with inline enable check
    ENABLE_AI_SLUG: aiEnabled,
    AI_MODEL:
      env.AI_MODEL || ('@cf/meta/llama-3.1-8b-instruct' as keyof AiModels),
    AI_ENABLE_CACHE: env.AI_ENABLE_CACHE !== 'false',
    AI_MAX_RETRIES: Number.parseInt(env.AI_MAX_RETRIES || '3'),
    AI_TIMEOUT: Number.parseInt(env.AI_TIMEOUT || '10000'),
  }
}

/**
 * Call AI service to generate slug
 */
async function callAI(
  env: CloudflareEnv,
  url: string,
): Promise<AISlugResponse> {
  const aiConfig = getAIConfig(env)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), aiConfig.AI_TIMEOUT)

  try {
    logger.debug(
      `[AI] Calling AI service, ${JSON.stringify({
        model: aiConfig.AI_MODEL,
        url,
      })}`,
    )

    const response = await env.AI.run(aiConfig.AI_MODEL, {
      messages: [
        { role: 'system', content: aiConfig.systemPrompt },
        ...aiConfig.examples,
        { role: 'user', content: url },
      ],
      stream: false,
      max_tokens: 100,
    })

    clearTimeout(timeoutId)

    let responseText: string

    if (typeof response === 'string') {
      responseText = response
    } else if (response && typeof response === 'object') {
      responseText =
        (response as any).response ||
        (response as any).result ||
        (response as any).content ||
        (response as any).text ||
        JSON.stringify(response)
    } else {
      throw new Error('Invalid AI response format')
    }

    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty AI response')
    }

    logger.info(
      `[AI] AI response received, ${JSON.stringify({
        model: aiConfig.AI_MODEL,
        url,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100),
      })}`,
    )

    // Parse the response
    const parsed = parseAIResponse(responseText)
    const cleanedSlug = cleanSlug(parsed.slug)

    return {
      success: true,
      slug: cleanedSlug,
      confidence: parsed.confidence || 0.8,
      method: 'ai',
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI request timeout after ${aiConfig.AI_TIMEOUT}ms`)
    }

    logger.error(
      `[AI] AI service call failed, ${JSON.stringify({
        model: aiConfig.AI_MODEL,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )

    throw error
  }
}

export async function generateAISlug(
  c: Context,
  url: string,
  options: { cache?: boolean } = {},
): Promise<AISlugResponse> {
  const aiConfig = getAIConfig(c.env)
  const { cache = aiConfig.AI_ENABLE_CACHE } = options

  // Check cache first
  if (cache && c.env.SHORTENER_KV) {
    const cached = await getCachedSlug(c.env.SHORTENER_KV, url)
    if (cached) {
      logger.debug(
        `[AI] Cache hit, ${JSON.stringify({
          url,
          slug: cached.slug,
        })}`,
      )
      return cached
    }
  }

  // Try AI generation
  try {
    const result = await callAI(c.env, url)

    // Cache the result
    if (cache && result.success && c.env.SHORTENER_KV) {
      await setCachedSlug(c.env.SHORTENER_KV, url, result)
    }

    return result
  } catch (error) {
    logger.error(
      `[AI] AI generation failed, ${JSON.stringify({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )

    throw error
  }
}

export function parseAIResponse(response: string) {
  try {
    const parsed = JSON.parse(response)
    if (!parsed.slug || typeof parsed.slug !== 'string') {
      throw new Error('Invalid slug in AI response')
    }
    return {
      slug: parsed.slug.toLowerCase().trim(),
      confidence: parsed.confidence || 0.8,
    }
  } catch (jsonError) {
    logger.info(
      `[AI] Failed to parse JSON, attempting advanced extraction, ${JSON.stringify(
        {
          response: response.substring(0, 200),
        },
      )}`,
    )

    // Try to extract JSON from text
    const jsonMatch = response.match(/\{[^}]*"slug"[^}]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.slug && typeof parsed.slug === 'string') {
          return {
            slug: parsed.slug.toLowerCase().trim(),
            confidence: parsed.confidence || 0.6,
          }
        }
      } catch {
        // Continue processing
      }
    }

    // Improved regex to match more specific slug patterns
    const slugMatch = response.match(/[a-z0-9][a-z0-9-]{1,18}[a-z0-9]/)
    if (slugMatch) {
      logger.warn(
        `[AI] Extracted slug from non-JSON response, originalResponse: ${response.substring(0, 100)}, extractedSlug: ${slugMatch[0]}`,
      )
      return {
        slug: slugMatch[0],
        confidence: 0.4,
      }
    }

    throw new Error('Failed to parse AI response: no valid slug found')
  }
}

/**
 * Clean and validate slug
 */
export function cleanSlug(slug: string): string {
  if (!slug) throw new Error('Empty slug')

  let cleaned = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Length limit
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20).replace(/-$/, '')
  }

  if (cleaned.length < 3) {
    throw new Error('Slug too short')
  }

  if (!/^[a-z0-9-]+$/.test(cleaned)) {
    throw new Error('Invalid slug format')
  }

  return cleaned
}

/**
 * Cache related functions
 */
export async function getCachedSlug(
  kv: KVNamespace,
  url: string,
): Promise<AISlugResponse | null> {
  try {
    const cacheKey = `ai-slug:${hashUrl(url)}`
    const cached = await kv.get(cacheKey, 'json')

    if (cached && isCacheValid(cached)) {
      return cached as AISlugResponse
    }

    return null
  } catch (error) {
    logger.error(`[AI] Cache read error, ${JSON.stringify({ url, error })}`)
    return null
  }
}

export async function setCachedSlug(
  kv: KVNamespace,
  url: string,
  result: AISlugResponse,
): Promise<void> {
  try {
    const cacheKey = `ai-slug:${hashUrl(url)}`
    await kv.put(
      cacheKey,
      JSON.stringify({
        ...result,
        cachedAt: Date.now(),
      }),
      {
        expirationTtl: 86400 * 7, // 7 days
      },
    )
  } catch (error) {
    logger.error(
      `[AI] Cache write error, ${JSON.stringify({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
  }
}

export function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).substring(0, 8)
}

export function isCacheValid(cached: any): boolean {
  const maxAge = 86400 * 7 * 1000 // 7 days (ms)
  return cached.cachedAt && Date.now() - cached.cachedAt < maxAge
}

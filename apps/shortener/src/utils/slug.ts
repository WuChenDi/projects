import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import type { Context } from 'hono'
import type {
  AIConfiguration,
  AIMessage,
  AISlugResponse,
  CloudflareEnv,
} from '@/types'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const SYSTEM_PROMPT = `You are a URL-to-slug converter specialist. Generate short, meaningful slugs for URLs.

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

  SLUG PATTERN: ${SLUG_REGEX.toString()}`

const FEW_SHOT_EXAMPLES: AIMessage[] = [
  { role: 'user', content: 'https://www.cloudflare.com/' },
  { role: 'assistant', content: '{"slug": "cloudflare"}' },
  { role: 'user', content: 'https://github.com/vercel/next.js' },
  { role: 'assistant', content: '{"slug": "nextjs"}' },
  { role: 'user', content: 'https://github.com/WuChenDi' },
  { role: 'assistant', content: '{"slug": "WuChenDi"}' },
  { role: 'user', content: 'https://github.com/cdLab996' },
  { role: 'assistant', content: '{"slug": "cdlab996"}' },
  { role: 'user', content: 'https://notes-wudi.pages.dev' },
  { role: 'assistant', content: '{"slug": "notes-wudi"}' },
  { role: 'user', content: 'https://clearify.pages.dev' },
  { role: 'assistant', content: '{"slug": "clearify"}' },
  { role: 'user', content: 'https://t.me/cdlab996' },
  { role: 'assistant', content: '{"slug": "tg-cdlab996"}' },
  { role: 'user', content: 'https://shortener.cdlab.workers.dev' },
  { role: 'assistant', content: '{"slug": "shortener"}' },
]

/** Read AI configuration from env vars with sensible fallbacks. */
export function getAIConfig(env: CloudflareEnv): AIConfiguration {
  const aiEnabled =
    env.ENABLE_AI_SLUG === 'true' && Boolean(env.AI_MODEL?.trim())

  return {
    systemPrompt: SYSTEM_PROMPT,
    examples: FEW_SHOT_EXAMPLES,
    ENABLE_AI_SLUG: aiEnabled,
    AI_MODEL:
      env.AI_MODEL || ('@cf/meta/llama-3.1-8b-instruct' as keyof AiModels),
    AI_ENABLE_CACHE: env.AI_ENABLE_CACHE !== 'false',
    AI_MAX_RETRIES: Number.parseInt(env.AI_MAX_RETRIES || '3'),
    AI_TIMEOUT: Number.parseInt(env.AI_TIMEOUT || '10000'),
  }
}

/** Call Workers AI to generate a slug for the given URL. */
async function callAI(
  env: CloudflareEnv,
  url: string,
): Promise<AISlugResponse> {
  const aiConfig = getAIConfig(env)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), aiConfig.AI_TIMEOUT)

  try {
    logger.debug(
      `[AI] Calling AI service, model: ${aiConfig.AI_MODEL}, url: ${url}`,
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

    let responseText: string
    if (typeof response === 'string') {
      responseText = response
    } else if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>
      responseText =
        (r.response as string) ||
        (r.result as string) ||
        (r.content as string) ||
        (r.text as string) ||
        JSON.stringify(response)
    } else {
      throw new Error('Invalid AI response format')
    }

    if (!responseText.trim()) {
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

    const parsed = parseAIResponse(responseText)
    return {
      success: true,
      slug: cleanSlug(parsed.slug),
      confidence: parsed.confidence,
      method: 'ai',
    }
  } catch (error) {
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
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Generate a slug for `url`, with KV caching when enabled. */
export async function generateAISlug(
  c: Context,
  url: string,
  options: { cache?: boolean } = {},
): Promise<AISlugResponse> {
  const aiConfig = getAIConfig(c.env)
  const useCache = options.cache ?? aiConfig.AI_ENABLE_CACHE
  const kv = c.env.SHORTENER_KV as KVNamespace | undefined

  if (useCache && kv) {
    const cached = await getCachedSlug(kv, url)
    if (cached) {
      logger.debug(`[AI] Cache hit, url: ${url}, slug: ${cached.slug}`)
      return cached
    }
  }

  const result = await callAI(c.env, url)
  if (useCache && result.success && kv) {
    await setCachedSlug(kv, url, result)
  }
  return result
}

/** Parse the model's JSON response, with progressive fallbacks. */
export function parseAIResponse(response: string): {
  slug: string
  confidence: number
} {
  // 1) Strict JSON
  try {
    const parsed = JSON.parse(response)
    if (parsed.slug && typeof parsed.slug === 'string') {
      return {
        slug: parsed.slug.toLowerCase().trim(),
        confidence: parsed.confidence || 0.8,
      }
    }
  } catch {
    // fall through
  }

  // 2) Embedded JSON object
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
      // fall through
    }
  }

  // 3) Bare slug-shaped substring
  const slugMatch = response.match(/[a-z0-9][a-z0-9-]{1,18}[a-z0-9]/)
  if (slugMatch) {
    logger.warn(
      `[AI] Extracted slug from non-JSON response, originalResponse: ${response.substring(0, 100)}, extractedSlug: ${slugMatch[0]}`,
    )
    return { slug: slugMatch[0], confidence: 0.4 }
  }

  throw new Error('Failed to parse AI response: no valid slug found')
}

/** Normalize and validate a slug; throws if it can't be made acceptable. */
export function cleanSlug(slug: string): string {
  if (!slug) throw new Error('Empty slug')

  let cleaned = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

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

function cacheKey(url: string): string {
  // First 16 hex chars (64 bits) of sha256 — collision-safe for URL bucketing.
  return `ai-slug:${bytesToHex(sha256(utf8ToBytes(url))).slice(0, 16)}`
}

export async function getCachedSlug(
  kv: KVNamespace,
  url: string,
): Promise<AISlugResponse | null> {
  try {
    const cached = await kv.get<AISlugResponse>(cacheKey(url), 'json')
    return cached && isCacheValid(cached) ? cached : null
  } catch (error) {
    logger.error(
      `[AI] Cache read error, url: ${url}, error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
    return null
  }
}

export async function setCachedSlug(
  kv: KVNamespace,
  url: string,
  result: AISlugResponse,
): Promise<void> {
  try {
    await kv.put(
      cacheKey(url),
      JSON.stringify({ ...result, cachedAt: Date.now() }),
      { expirationTtl: CACHE_TTL_SECONDS },
    )
  } catch (error) {
    logger.error(
      `[AI] Cache write error, url: ${url}, error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export function isCacheValid(cached: AISlugResponse): boolean {
  return (
    !!cached.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL_SECONDS * 1000
  )
}

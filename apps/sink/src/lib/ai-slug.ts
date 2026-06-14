import { getConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { randomSlug, SLUG_REGEX } from '@/lib/slug'

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const AI_TIMEOUT_MS = 10_000

const DEFAULT_PROMPT =
  'You are a URL-to-slug converter. Given a URL, produce a short, human-readable slug derived from the URL and its purpose. Use only lowercase letters, numbers and single hyphens, at most three words. Return ONLY JSON: {"slug": "example-slug"}'

// Coerce an arbitrary AI response into a valid slug, or null when unusable.
function parseSlug(text: string): string | null {
  const match = text.match(/\{[^}]*"slug"\s*:\s*"([^"]+)"[^}]*\}/u)
  const raw = (match?.[1] ?? '').trim().toLowerCase()
  const cleaned = raw
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned && SLUG_REGEX.test(cleaned) ? cleaned : null
}

async function readResponseText(response: unknown): Promise<string> {
  if (typeof response === 'string') return response
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>
    return String(r.response ?? r.result ?? r.text ?? '')
  }
  return ''
}

// Generate a slug for `url` via Workers AI, with a 7-day KV cache and a random
// fallback when AI is unavailable (e.g. local dev with no remote bindings) or
// returns an unusable result.
export async function generateAiSlug(
  env: CloudflareEnv,
  url: string,
): Promise<{ slug: string; method: 'ai' | 'cache' | 'fallback' }> {
  const cacheKey = `ai:slug:${url}`
  try {
    const cached = await env.KV?.get(cacheKey)
    if (cached) return { slug: cached, method: 'cache' }
  } catch {
    // cache read is best-effort
  }

  const { aiModel, aiPrompt } = getConfig(env)
  if (env.AI) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
      try {
        const response = await env.AI.run(aiModel as keyof AiModels, {
          messages: [
            { role: 'system', content: aiPrompt || DEFAULT_PROMPT },
            { role: 'user', content: url },
          ],
          stream: false,
          max_tokens: 64,
        })
        const slug = parseSlug(await readResponseText(response))
        if (slug) {
          try {
            await env.KV?.put(cacheKey, slug, {
              expirationTtl: CACHE_TTL_SECONDS,
            })
          } catch {
            // cache write is best-effort
          }
          return { slug, method: 'ai' }
        }
      } finally {
        clearTimeout(timer)
      }
    } catch (error) {
      logger.warn(
        'AI slug generation failed, using fallback',
        error instanceof Error ? error.message : error,
      )
    }
  }

  return {
    slug: randomSlug(getConfig(env).slugDefaultLength),
    method: 'fallback',
  }
}

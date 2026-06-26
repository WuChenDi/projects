import { getConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

const AI_TIMEOUT_MS = 10_000

const DEFAULT_OG_PROMPT =
  'You generate OpenGraph metadata for a URL. Return ONLY JSON of the form {"title": "...", "description": "..."}. The title is the site/page name (max ~60 chars); the description is one concise sentence (max ~160 chars). No markdown, no extra keys.'

export interface OgMetadata {
  title: string
  description: string
}

// Hostname-based fallback when AI is unavailable or returns junk.
function fallbackMetadata(url: string): OgMetadata {
  try {
    const { hostname } = new URL(url)
    return {
      title: hostname.replace(/^www\./, ''),
      description: `Short link for ${url}`,
    }
  } catch {
    return { title: 'Short Link', description: 'Check out this link.' }
  }
}

function parseOg(text: string): Partial<OgMetadata> | null {
  // Strip a ```json … ``` fence if present, then grab the first JSON object.
  const unfenced = text.replace(/```(?:json)?/gi, '').trim()
  const match = unfenced.match(/\{[\s\S]*\}/u)
  if (!match) return null
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>
    return {
      title: typeof obj.title === 'string' ? obj.title.trim() : undefined,
      description:
        typeof obj.description === 'string'
          ? obj.description.trim()
          : undefined,
    }
  } catch {
    return null
  }
}

async function readResponseText(response: unknown): Promise<string> {
  if (typeof response === 'string') return response
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>
    return String(r.response ?? r.result ?? r.text ?? '')
  }
  return ''
}

// Generate OpenGraph title/description for `url` via Workers AI, falling back to
// hostname-derived metadata when AI is unavailable or returns an unusable
// result. `locale` (e.g. 'en', 'zh') asks the model to write in that language.
export async function generateAiOg(
  env: CloudflareEnv,
  url: string,
  locale?: string,
): Promise<OgMetadata & { method: 'ai' | 'fallback' }> {
  const fallback = fallbackMetadata(url)
  const { aiModel, aiOgPrompt } = getConfig(env)
  if (!env.AI) return { ...fallback, method: 'fallback' }

  const system = `${aiOgPrompt || DEFAULT_OG_PROMPT}${
    locale ? `\nWrite the title and description in this locale: ${locale}.` : ''
  }`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const response = await env.AI.run(aiModel as keyof AiModels, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: 'https://www.cloudflare.com/' },
          {
            role: 'assistant',
            content:
              '{"title": "Cloudflare", "description": "Cloudflare makes everything you connect to the Internet secure, private, fast, and reliable."}',
          },
          { role: 'user', content: url },
        ],
        stream: false,
        max_tokens: 256,
      })
      const parsed = parseOg(await readResponseText(response))
      if (parsed?.title || parsed?.description) {
        return {
          title: parsed.title || fallback.title,
          description: parsed.description || fallback.description,
          method: 'ai',
        }
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    logger.warn(
      'AI OG generation failed, using fallback',
      error instanceof Error ? error.message : error,
    )
  }

  return { ...fallback, method: 'fallback' }
}

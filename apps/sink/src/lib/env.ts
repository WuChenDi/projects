import { getCloudflareContext } from '@opennextjs/cloudflare'

// Resolved, typed view of the env flags wired in wrangler.jsonc. Reading goes
// through here so defaults live in one place and every call site is consistent.
export interface SinkConfig {
  siteToken: string
  redirectStatusCode: number
  linkCacheTtl: number
  redirectWithQuery: boolean
  homeURL: string
  notFoundRedirect: string
  caseSensitive: boolean
  slugDefaultLength: number
  listQueryLimit: number
  dataset: string
  disableBotAccessLog: boolean
  aiModel: string
  aiPrompt: string
  // Analytics Engine SQL API credentials (required only for the stats endpoints).
  cfAccountId: string
  cfApiToken: string
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && value !== undefined && value !== ''
    ? n
    : fallback
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

type RawEnv = Partial<Record<keyof CloudflareEnv, string>>

// `env` may be injected (cron/worker scheduled path); otherwise fall back to the
// fetch-time Cloudflare context, then to process.env (dev / build).
export function getConfig(env?: CloudflareEnv): SinkConfig {
  let raw: RawEnv = (env as RawEnv | undefined) ?? {}
  if (!env) {
    try {
      raw = getCloudflareContext().env as unknown as RawEnv
    } catch {
      raw = process.env as unknown as RawEnv
    }
  }

  // CF API creds aren't part of the generated CloudflareEnv type — read loosely.
  const loose = raw as Record<string, string | undefined>

  return {
    siteToken: raw.SITE_TOKEN ?? process.env.SITE_TOKEN ?? '',
    redirectStatusCode: num(raw.REDIRECT_STATUS_CODE, 308),
    linkCacheTtl: num(raw.LINK_CACHE_TTL, 60),
    redirectWithQuery: bool(raw.REDIRECT_WITH_QUERY),
    homeURL: raw.HOME_URL ?? '',
    notFoundRedirect: raw.NOT_FOUND_REDIRECT ?? '',
    caseSensitive: bool(raw.CASE_SENSITIVE),
    slugDefaultLength: num(raw.SLUG_DEFAULT_LENGTH, 6),
    listQueryLimit: num(raw.LIST_QUERY_LIMIT, 500),
    dataset: raw.DATASET ?? 'sink_analytics',
    disableBotAccessLog: bool(raw.DISABLE_BOT_ACCESS_LOG),
    aiModel: raw.AI_MODEL ?? '@cf/meta/llama-3.1-8b-instruct',
    aiPrompt: raw.AI_PROMPT ?? '',
    cfAccountId: loose.CLOUDFLARE_ACCOUNT_ID ?? '',
    cfApiToken: loose.CLOUDFLARE_API_TOKEN ?? '',
  }
}

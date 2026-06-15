import { getConfig } from '@/lib/env'

// Logical dimension → Analytics Engine column, matching the write order in
// lib/analytics.ts (writeAccessLog). `timestamp` is AE's built-in event-time
// column; `_sample_interval` is AE's built-in sampling weight.
const FIELD = {
  slug: 'blob1',
  url: 'blob2',
  ua: 'blob3',
  ip: 'blob4',
  referer: 'blob5',
  country: 'blob6',
  region: 'blob7',
  city: 'blob8',
  timezone: 'blob9',
  language: 'blob10',
  os: 'blob11',
  browser: 'blob12',
  browserType: 'blob13',
  device: 'blob14',
  deviceType: 'blob15',
  colo: 'blob16',
  domain: 'blob17',
} as const

export type Dimension = keyof typeof FIELD
export const METRIC_DIMENSIONS: Dimension[] = [
  'country',
  'region',
  'city',
  'referer',
  'slug',
  'language',
  'timezone',
  'device',
  'deviceType',
  'os',
  'browser',
  'browserType',
]

// Filter dimensions a request may pin (drill-down). Subset of FIELD.
const FILTERABLE: Dimension[] = [
  'slug',
  'country',
  'region',
  'city',
  'referer',
  'device',
  'deviceType',
  'os',
  'browser',
  'browserType',
  'language',
  'timezone',
]

export interface StatsQuery {
  startAt?: number // epoch ms
  endAt?: number // epoch ms
  filters: Partial<Record<Dimension, string>>
}

export class AnalyticsNotConfiguredError extends Error {
  constructor() {
    super('Analytics Engine SQL API credentials are not configured')
    this.name = 'AnalyticsNotConfiguredError'
  }
}

// Escape a value for a single-quoted Analytics Engine (ClickHouse) SQL literal.
// ClickHouse treats BOTH backslash and single-quote as escapes inside a string
// literal, so a trailing/embedded backslash can escape the closing quote and
// break out — escape the backslash first, then the quote. Control chars are
// also dropped. Filter values are second-order untrusted (analytics dimensions
// like referer/slug are visitor-controlled), so this must be backslash-safe.
function sanitize(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    if (code >= 32 && code !== 127) out += ch
  }
  return out.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function isConfigured(env: CloudflareEnv): boolean {
  const { cfAccountId, cfApiToken } = getConfig(env)
  return Boolean(cfAccountId && cfApiToken)
}

function whereClause(query: StatsQuery): string {
  const conditions: string[] = ['1=1']
  for (const dim of FILTERABLE) {
    const value = query.filters[dim]
    if (value) conditions.push(`${FIELD[dim]} = '${sanitize(value)}'`)
  }
  if (query.startAt) {
    conditions.push(
      `timestamp >= toDateTime(${Math.floor(query.startAt / 1000)})`,
    )
  }
  if (query.endAt) {
    conditions.push(
      `timestamp <= toDateTime(${Math.floor(query.endAt / 1000)})`,
    )
  }
  // Default window: last 7 days when no explicit range is given.
  if (!query.startAt && !query.endAt) {
    conditions.push(`timestamp >= now() - INTERVAL '7' DAY`)
  }
  return `WHERE ${conditions.join(' AND ')}`
}

// Sampling-weighted unique count (AE returns sampled rows; scale distinct).
const VISITORS = `ROUND(COUNT(DISTINCT ${FIELD.ip}) * SUM(_sample_interval) / COUNT())`

export async function executeAeSql<T = Record<string, string>>(
  env: CloudflareEnv,
  sql: string,
): Promise<T[]> {
  const { cfAccountId, cfApiToken } = getConfig(env)
  if (!cfAccountId || !cfApiToken) throw new AnalyticsNotConfiguredError()

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfApiToken}`,
        'content-type': 'application/sql',
      },
      body: sql,
    },
  )
  if (!res.ok) {
    throw new Error(`Analytics query failed: ${res.status} ${await res.text()}`)
  }
  const body = (await res.json()) as { data?: T[] }
  return body.data ?? []
}

export function dataset(env: CloudflareEnv): string {
  return getConfig(env).dataset
}

export function countersSql(env: CloudflareEnv, q: StatsQuery): string {
  return `SELECT
      SUM(_sample_interval) AS visits,
      ${VISITORS} AS visitors,
      COUNT(DISTINCT if(${FIELD.referer} = 'direct', NULL, ${FIELD.referer})) AS referers
    FROM ${dataset(env)} ${whereClause(q)}`
}

export function viewsSql(
  env: CloudflareEnv,
  q: StatsQuery,
  interval: 'hour' | 'day',
): string {
  const fmt = interval === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d'
  return `SELECT
      formatDateTime(timestamp, '${fmt}') AS time,
      SUM(_sample_interval) AS visits,
      ${VISITORS} AS visitors
    FROM ${dataset(env)} ${whereClause(q)}
    GROUP BY time ORDER BY time`
}

export function metricsSql(
  env: CloudflareEnv,
  q: StatsQuery,
  type: Dimension,
  limit: number,
): string {
  const col = FIELD[type]
  return `SELECT ${col} AS name, SUM(_sample_interval) AS count
    FROM ${dataset(env)} ${whereClause(q)} AND ${col} != ''
    GROUP BY name ORDER BY count DESC LIMIT ${Math.max(1, Math.floor(limit))}`
}

// Weekday (0=Sunday .. 6=Saturday) x hour (00..23) grid.
export function heatmapSql(env: CloudflareEnv, q: StatsQuery): string {
  return `SELECT
      formatDateTime(timestamp, '%w') AS weekday,
      formatDateTime(timestamp, '%H') AS hour,
      SUM(_sample_interval) AS visits,
      ${VISITORS} AS visitors
    FROM ${dataset(env)} ${whereClause(q)}
    GROUP BY weekday, hour`
}

// Aggregated geo points (rounded to ~0.1deg) for the world map.
// latitude/longitude are AE doubles (double1/double2), not blobs.
const LAT = 'double1'
const LNG = 'double2'
export function locationSql(
  env: CloudflareEnv,
  q: StatsQuery,
  limit: number,
): string {
  return `SELECT
      ROUND(${LAT}, 1) AS lat,
      ROUND(${LNG}, 1) AS lng,
      SUM(_sample_interval) AS count
    FROM ${dataset(env)} ${whereClause(q)}
      AND (${LAT} != 0 OR ${LNG} != 0)
    GROUP BY lat, lng ORDER BY count DESC LIMIT ${Math.max(1, Math.floor(limit))}`
}

// Recent raw events for the realtime log feed.
export function eventsSql(
  env: CloudflareEnv,
  q: StatsQuery,
  limit: number,
): string {
  return `SELECT
      ${FIELD.slug} AS slug,
      ${FIELD.country} AS country,
      ${FIELD.city} AS city,
      ${FIELD.os} AS os,
      ${FIELD.browser} AS browser,
      ${FIELD.deviceType} AS deviceType,
      timestamp
    FROM ${dataset(env)} ${whereClause(q)}
    ORDER BY timestamp DESC LIMIT ${Math.max(1, Math.floor(limit))}`
}

// Parse StatsQuery (range + drill-down filters) from request search params.
export function parseStatsQuery(params: URLSearchParams): StatsQuery {
  const filters: Partial<Record<Dimension, string>> = {}
  for (const dim of FILTERABLE) {
    const v = params.get(dim)
    if (v) filters[dim] = v
  }
  const startAt = Number(params.get('startAt')) || undefined
  const endAt = Number(params.get('endAt')) || undefined
  return { startAt, endAt, filters }
}

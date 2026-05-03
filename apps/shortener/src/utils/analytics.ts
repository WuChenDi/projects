import type { CloudflareAnalyticsResponse, CloudflareEnv } from '@/types'

/**
 * Analytics Engine field mapping configuration
 * Maps logical field names to Analytics Engine storage fields
 * Optimized for query performance and data organization
 */
export const FIELD_MAPPING = {
  // Primary index field for efficient hash-based queries
  hash: 'index1',

  // String data fields (blobs) - ordered by query frequency and importance
  linkId: 'blob1', // Database record ID for data correlation
  userId: 'blob2', // User identifier for user analytics
  shortCode: 'blob3', // Short code for URL reconstruction
  domain: 'blob4', // Domain for multi-domain analytics
  targetUrl: 'blob5', // Target URL destination
  userAgent: 'blob6', // User agent string for device detection
  ip: 'blob7', // Client IP for unique visitor tracking
  referer: 'blob8', // Referrer hostname for traffic source analysis
  country: 'blob9', // Country for geographic analytics
  region: 'blob10', // Region/state information
  city: 'blob11', // City information
  timezone: 'blob12', // Client timezone
  language: 'blob13', // Primary language preference
  os: 'blob14', // Operating system for device analytics
  browser: 'blob15', // Browser name for browser analytics
  browserVersion: 'blob16', // Browser version for compatibility analysis
  deviceType: 'blob17', // Device type (desktop/mobile/tablet)
  deviceModel: 'blob18', // Device model information
  colo: 'blob19', // Cloudflare edge location

  // Numeric data fields (doubles) for mathematical operations
  latitude: 'double1', // Geographic latitude
  longitude: 'double2', // Geographic longitude
  timestamp: 'double3', // Visit timestamp for time-based analysis
} as const

/**
 * Time format patterns for Analytics Engine date formatting
 * Used in formatDateTime() SQL function for time series analysis
 */
export const TIME_FORMATS = {
  hour: '%Y-%m-%d %H:00:00', // Hourly aggregation: 2024-01-01 14:00:00
  day: '%Y-%m-%d', // Daily aggregation: 2024-01-01
  week: '%Y-W%V', // Weekly aggregation: 2024-W01
  month: '%Y-%m', // Monthly aggregation: 2024-01
} as const

/**
 * Bot detection patterns for filtering automated traffic
 * Comprehensive list of common bot user agent substrings
 */
export const BOT_PATTERNS = [
  // Generic bot patterns
  'bot',
  'crawler',
  'spider',
  'scraper',

  // Social media crawlers
  'facebook',
  'twitter',
  'linkedin',
  'telegram',
  'whatsapp',
  'discord',
  'slack',

  // Search engine bots
  'googlebot',
  'bingbot',
  'yahoobot',

  // Specific social platform bots
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
] as const

/**
 * Get the Analytics Engine field name for a logical field
 *
 * @param fieldName - Logical field name from FIELD_MAPPING
 * @returns Analytics Engine field name (e.g., 'blob1', 'double1')
 */
export function getField(fieldName: keyof typeof FIELD_MAPPING): string {
  return FIELD_MAPPING[fieldName]
}

/**
 * Build SQL SELECT clause with field aliases
 * Maps logical field names to Analytics Engine fields with proper aliases
 *
 * @param fields - Object mapping alias names to logical field names
 * @returns SQL SELECT fields string
 *
 * @example
 * buildSelectFields({ country: 'country', browser: 'browser' })
 * // Returns: "blob9 as country, blob15 as browser"
 */
export function buildSelectFields(
  fields: Record<string, keyof typeof FIELD_MAPPING>,
): string {
  return Object.entries(fields)
    .map(([alias, fieldName]) => `${getField(fieldName)} as ${alias}`)
    .join(', ')
}

/**
 * Build SQL WHERE clause from query parameters
 * Safely constructs filtering conditions with proper SQL escaping
 *
 * @param query - Query parameters object
 * @returns SQL WHERE clause string (empty if no conditions)
 */
export function buildWhereConditions(query: {
  hash?: string
  linkId?: string
  userId?: string
  shortCode?: string
  domain?: string
  country?: string
  startTime?: number
  endTime?: number
}): string {
  const conditions: string[] = ['1=1'] // Always true condition as base

  // String field conditions with SQL injection protection
  if (query.hash) {
    conditions.push(`${getField('hash')} = '${sanitizeSqlInput(query.hash)}'`)
  }
  if (query.linkId) {
    conditions.push(
      `${getField('linkId')} = '${sanitizeSqlInput(query.linkId)}'`,
    )
  }
  if (query.userId) {
    conditions.push(
      `${getField('userId')} = '${sanitizeSqlInput(query.userId)}'`,
    )
  }
  if (query.shortCode) {
    conditions.push(
      `${getField('shortCode')} = '${sanitizeSqlInput(query.shortCode)}'`,
    )
  }
  if (query.domain) {
    conditions.push(
      `${getField('domain')} = '${sanitizeSqlInput(query.domain)}'`,
    )
  }
  if (query.country) {
    conditions.push(
      `${getField('country')} = '${sanitizeSqlInput(query.country)}'`,
    )
  }

  // Numeric timestamp conditions (no escaping needed for numbers)
  if (query.startTime) {
    conditions.push(`${getField('timestamp')} >= ${query.startTime}`)
  }
  if (query.endTime) {
    conditions.push(`${getField('timestamp')} <= ${query.endTime}`)
  }

  // Return WHERE clause only if there are actual conditions
  return conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : ''
}

/**
 * Get time format pattern for SQL date formatting
 *
 * @param interval - Time interval (hour/day/week/month)
 * @returns SQL date format pattern, defaults to daily if invalid
 */
export function getIntervalFormat(interval: string): string {
  return TIME_FORMATS[interval as keyof typeof TIME_FORMATS] || TIME_FORMATS.day
}

/**
 * Sanitize SQL input to prevent SQL injection
 * Removes potentially dangerous characters from user input
 *
 * @param input - Raw user input string
 * @returns Sanitized string safe for SQL queries
 *
 * @example
 * sanitizeSqlInput("'; DROP TABLE users; --")
 * // Returns: " DROP TABLE users "
 */
export function sanitizeSqlInput(input: string): string {
  return input.replace(/['"]/g, '').replace(/[;\-]/g, '')
}

/**
 * Get Analytics Engine dataset name from environment
 *
 * @param env - Cloudflare environment configuration
 * @returns Dataset name, defaults to 'shortener_analytics'
 */
export function getDatasetName(env: CloudflareEnv): string {
  return env.ANALYTICS_DATASET || 'shortener_analytics'
}

/**
 * Execute SQL query against Cloudflare Analytics Engine
 * Handles authentication, error handling, and response parsing
 *
 * @param env - Cloudflare environment with API credentials
 * @param sql - SQL query string to execute
 * @returns Promise resolving to query results
 * @throws Error if credentials missing or query fails
 */
export async function executeQuery(
  env: CloudflareEnv,
  sql: string,
): Promise<CloudflareAnalyticsResponse> {
  logger.debug(`Executing Analytics Engine query, sql: ${sql}`)

  // Validate required credentials
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN')
  }

  // Execute query via Cloudflare API
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/sql',
      },
      body: sql,
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Analytics query failed: ${response.status} ${error}`)
  }

  const result: CloudflareAnalyticsResponse = await response.json()
  logger.debug(
    `Analytics query executed successfully, result: ${JSON.stringify(result)}`,
  )

  return result
}

/**
 * Detect if user agent represents a bot or automated client
 * Used for filtering bot traffic from analytics if desired
 *
 * @param userAgent - User agent string from request headers
 * @returns true if user agent matches known bot patterns
 *
 * @example
 * isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')
 * // Returns: true
 *
 * isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
 * // Returns: false
 */
export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern))
}

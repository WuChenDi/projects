export interface CloudflareEnv {
  AI: Ai
  SHORTENER_KV: KVNamespace
  ANALYTICS: AnalyticsEngineDataset

  // The Service runtime preset to use for deployment.
  DEPLOY_RUNTIME: 'cf' | 'node'
  // Database Type
  DB_TYPE: 'libsql' | 'd1'
  // LibSQL Configuration
  // The URL for connecting to the LibSQL database. Default is a local SQLite file.
  LIBSQL_URL: string
  // The authentication token for accessing the LibSQL
  LIBSQL_AUTH_TOKEN: string
  // The public key for JWT verification
  JWT_PUBKEY: string

  // ==================== Cloudflare API Configuration ====================
  // Cloudflare Account ID for Analytics Engine queries
  CLOUDFLARE_ACCOUNT_ID: string
  // Cloudflare API Token for Analytics Engine access
  CLOUDFLARE_API_TOKEN: string
  // Analytics Engine dataset name (configured in wrangler.toml)
  ANALYTICS_DATASET?: string

  // ==================== AI Functional Configuration ====================
  // Whether to enable AI Slug generation
  ENABLE_AI_SLUG?: 'true' | 'false'
  // AI model name, defaults to the value in config file
  AI_MODEL?: keyof AiModels
  // Whether to enable AI result caching, 'true'/'false'
  AI_ENABLE_CACHE?: 'true' | 'false'
  // Maximum retry count for AI calls
  AI_MAX_RETRIES?: string
  // AI call timeout (milliseconds)
  AI_TIMEOUT?: string

  // ==================== Analytics Configuration ====================
  // Analytics sampling rate, '1.0' means 100%
  ANALYTICS_SAMPLE_RATE?: string
  // Whether to disable bot access analytics, 'true'/'false'
  DISABLE_BOT_ANALYTICS?: string
}

export interface Variables {
  auth: any
  requestId: string
  startTime: number
  urlData: UrlData
}

// Request interfaces
export interface CreateUrlRequest {
  records: CreateUrlRecord[]
}

export interface CreateUrlRecord {
  url: string
  expiresAt: number
  hash: string
  userId?: string
  attribute?: Blob
}

export interface UpdateUrlRequest {
  records: UpdateUrlRecord[]
}

export interface UpdateUrlRecord {
  hash: string
  url?: string
  expiresAt?: number
  userId?: string
  attribute?: Blob
}

export interface DeleteUrlRequest {
  hashList: string[]
}

// Response interfaces
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface OperationResult {
  hash: string
  shortCode?: string
  success: boolean
  error?: string
  shortUrl?: string
  url?: string
  expiresAt?: number
}

export interface BatchOperationResponse {
  successes: OperationResult[]
  failures: OperationResult[]
}

// Service health check response
export interface ServiceHealthResponse {
  service: string
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  database?: 'connected' | 'disconnected'
  analytics?: 'available' | 'unavailable'
  error?: string
}

export interface UrlData {
  id: number
  url: string
  userId: string
  expiresAt: number | null
  hash: string
  shortCode: string
  domain: string
  attribute: unknown
  createdAt: Date
  updatedAt: Date
  isDeleted: number
}

// ==================== AI Related Type Definitions ====================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// AI Slug generation response
export interface AISlugResponse {
  success: boolean
  slug: string
  confidence: number // 0-1 confidence level
  method: 'ai' | 'fallback' | 'cache' // Generation method
  cachedAt?: number // Cache timestamp
}

// AI configuration object returned by getAIConfig
export interface AIConfiguration {
  systemPrompt: string
  examples: AIMessage[]
  ENABLE_AI_SLUG: boolean
  AI_MODEL: keyof AiModels
  AI_ENABLE_CACHE: boolean
  AI_MAX_RETRIES: number
  AI_TIMEOUT: number
}

// AI generation options
export interface AIOptions {
  cache?: boolean
}

// Batch processing types (if needed in the future)
export interface AIBatchResult {
  url: string
  result: AISlugResponse | null
  error: string | null
}

export interface AIBatchSummary {
  total: number
  success: number
  failed: number
}

// ==================== Analytics Related Type Definitions ====================

// Analytics data point structure for Analytics Engine
export interface AnalyticsDataPoint {
  // Timestamp
  timestamp: number

  // Link information
  linkId: number
  userId: string
  shortCode: string
  domain: string
  targetUrl: string

  // Request information
  userAgent: string
  ip: string
  referer: string

  // Geographic information
  country: string
  region: string
  city: string
  timezone: string
  language: string

  // Device and browser information
  os: string
  browser: string
  browserVersion: string
  deviceType: string
  deviceModel: string

  // Cloudflare specific
  colo: string

  // Geographic coordinates
  latitude: number
  longitude: number
}

// Analytics query parameters
export interface AnalyticsQuery {
  linkId?: string
  userId?: string
  shortCode?: string
  domain?: string
  country?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
  interval?: 'hour' | 'day' | 'week' | 'month'
  timezone?: string
}

// Analytics overview response
export interface AnalyticsOverview {
  totalClicks: number
  uniqueVisitors: number
  uniqueLinks: number
  uniqueCountries: number
}

// Time series data point
export interface TimeSeriesDataPoint {
  timeLabel: string
  clicks: number
  uniqueVisitors: number
}

// Country statistics
export interface CountryStats {
  country: string
  clicks: number
  uniqueVisitors: number
}

// Referrer statistics
export interface ReferrerStats {
  referrer: string
  clicks: number
  uniqueVisitors: number
}

// Device statistics
export interface DeviceStats {
  deviceType: string
  os: string
  browser: string
  clicks: number
  uniqueVisitors: number
}

// Link-specific analytics response
export interface LinkAnalytics {
  shortCode: string
  overview: {
    totalClicks: number
    uniqueVisitors: number
    firstClick?: number
    lastClick?: number
  }
  timeseries: TimeSeriesDataPoint[]
  topCountries: CountryStats[]
}

// Real-time analytics (for dashboard)
export interface RealTimeAnalytics {
  activeVisitors: number
  clicksLast24h: number
  topLinksToday: Array<{
    shortCode: string
    clicks: number
    url: string
  }>
  recentClicks: Array<{
    timestamp: number
    shortCode: string
    country: string
    device: string
  }>
}

// Analytics summary for admin dashboard
export interface AnalyticsSummary {
  totalLinks: number
  totalClicks: number
  totalUniqueVisitors: number
  clicksToday: number
  clicksThisWeek: number
  clicksThisMonth: number
  topPerformingLinks: Array<{
    shortCode: string
    url: string
    clicks: number
    uniqueVisitors: number
  }>
  recentActivity: Array<{
    timestamp: number
    shortCode: string
    country: string
    clicks: number
  }>
  geographicDistribution: CountryStats[]
  deviceBreakdown: {
    desktop: number
    mobile: number
    tablet: number
    other: number
  }
  browserBreakdown: {
    [browserName: string]: number
  }
}

// Analytics export data
export interface AnalyticsExport {
  meta: {
    exportDate: string
    dateRange: {
      start: number
      end: number
    }
    totalRecords: number
  }
  data: AnalyticsDataPoint[]
}

// Analytics aggregation options
export interface AnalyticsAggregationOptions {
  groupBy: 'country' | 'browser' | 'os' | 'device' | 'referrer' | 'day' | 'hour'
  timeRange: {
    start: number
    end: number
  }
  filters?: {
    country?: string[]
    browser?: string[]
    device?: string[]
    shortCode?: string[]
  }
  limit?: number
  offset?: number
}

/**
 * Analytics data structure for Cloudflare Analytics Engine
 * Optimized for efficient querying and storage
 */
export interface AnalyticsData {
  /**
   * Unique hash identifier for the analytics event
   */
  hash: string

  // String data (blobs)
  /**
   * Database record ID
   */
  linkId: string
  /**
   * User identifier for user analytics
   */
  userId: string
  /**
   * Short code for URL reconstruction
   */
  shortCode: string
  /**
   * Domain for multi-domain analysis
   */
  domain: string
  /**
   * Target URL destination
   */
  targetUrl: string
  /**
   * Full user agent string
   */
  userAgent: string
  /**
   * Client IP address for unique visitor tracking
   */
  ip: string
  /**
   * Referrer hostname for traffic source analysis
   */
  referer: string
  /**
   * Country name for geographic analysis
   */
  country: string
  /**
   * Region/state information
   */
  region: string
  /**
   * City information
   */
  city: string
  /**
   * Timezone
   */
  timezone: string
  /**
   * Primary language preference
   */
  language: string
  /**
   * Operating system
   */
  os: string
  /**
   * Browser name
   */
  browser: string
  /**
   * Browser version
   */
  browserVersion: string
  /**
   * Device type (desktop/mobile/tablet)
   */
  deviceType: string
  /**
   * Device model information
   */
  deviceModel: string
  /**
   * Cloudflare edge location
   */
  colo: string

  // Numeric data
  /**
   * Geographic latitude
   */
  latitude: number
  /**
   * Geographic longitude
   */
  longitude: number
  /**
   * Visit timestamp in milliseconds
   */
  timestamp: number
}

/**
 * Analytics aggregation result
 *
 * - links: https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/#format-clause
 */
export interface CloudflareAnalyticsResponse {
  meta: Array<{
    name: string
    type: string
  }>
  data: Record<string, string>[]
  rows: number
  rows_before_limit_at_least: number
}

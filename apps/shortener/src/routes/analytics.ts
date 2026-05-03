import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ApiResponse, CloudflareEnv, Variables } from '@/types'
import {
  analyticsQuerySchema,
  buildSelectFields,
  buildWhereConditions,
  executeQuery,
  getDatasetName,
  getField,
  getIntervalFormat,
  sanitizeSqlInput,
  timeSeriesQuerySchema,
} from '@/utils'

export const analyticsRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

function ensureAnalyticsAvailable(env: CloudflareEnv) {
  if (!env.ANALYTICS) {
    throw new HTTPException(503, {
      message: 'Analytics Engine not available',
    })
  }
}

// GET /api/analytics/overview
analyticsRoutes.get(
  '/overview',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Analytics overview requested`)

    const sql = `
      SELECT
        SUM(_sample_interval) as totalClicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors,
        COUNT(DISTINCT ${getField('hash')}) as uniqueLinks,
        COUNT(DISTINCT ${getField('country')}) as uniqueCountries
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
    `

    const { data: result } = await executeQuery(c.env, sql)
    const data = result[0] || {
      totalClicks: 0,
      uniqueVisitors: 0,
      uniqueLinks: 0,
      uniqueCountries: 0,
    }

    return c.json<ApiResponse>({ code: 0, message: 'success', data })
  },
)

// GET /api/analytics/timeseries
analyticsRoutes.get(
  '/timeseries',
  zValidator('query', timeSeriesQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Analytics timeseries requested`)

    const intervalFormat = getIntervalFormat(query.interval)
    const sql = `
      SELECT
        formatDateTime(FROM_UNIXTIME(${getField('timestamp')}/1000), '${intervalFormat}', '${sanitizeSqlInput(query.timezone)}') as timeLabel,
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      GROUP BY timeLabel
      ORDER BY timeLabel
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/top-countries
analyticsRoutes.get(
  '/top-countries',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Top countries analytics requested`)

    const sql = `
      SELECT
        ${buildSelectFields({ country: 'country' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/top-referrers
analyticsRoutes.get(
  '/top-referrers',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Top referrers analytics requested`)

    const sql = `
      SELECT
        ${buildSelectFields({ referrer: 'referer' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      AND ${getField('referer')} != 'direct'
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/devices
analyticsRoutes.get(
  '/devices',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Device analytics requested`)

    const sql = `
      SELECT
        ${buildSelectFields({ deviceType: 'deviceType', os: 'os', browser: 'browser' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      GROUP BY deviceType, os, browser
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/browsers
analyticsRoutes.get(
  '/browsers',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Browser analytics requested`)

    const sql = `
      SELECT
        ${buildSelectFields({ browser: 'browser', browserVersion: 'browserVersion' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      GROUP BY browser, browserVersion
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/operating-systems
analyticsRoutes.get(
  '/operating-systems',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(`[${requestId}] Operating systems analytics requested`)

    const sql = `
      SELECT
        ${buildSelectFields({ os: 'os' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${getDatasetName(c.env)}
      ${buildWhereConditions(query)}
      GROUP BY os
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

    const { data: result } = await executeQuery(c.env, sql)
    return c.json<ApiResponse>({ code: 0, message: 'success', data: result })
  },
)

// GET /api/analytics/link/:hash
analyticsRoutes.get(
  '/link/:hash',
  zValidator('query', timeSeriesQuerySchema),
  async (c) => {
    ensureAnalyticsAvailable(c.env)
    const hash = c.req.param('hash')
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Link-specific analytics requested, hash: ${hash}`,
    )

    const dataset = getDatasetName(c.env)
    const where = `WHERE ${getField('hash')} = '${sanitizeSqlInput(hash)}'`
    const intervalFormat = getIntervalFormat(query.interval)

    const overviewSql = `
      SELECT
        SUM(_sample_interval) as totalClicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors,
        MIN(${getField('timestamp')}) as firstClick,
        MAX(${getField('timestamp')}) as lastClick,
        ANY_VALUE(${getField('shortCode')}) as shortCode,
        ANY_VALUE(${getField('domain')}) as domain,
        ANY_VALUE(${getField('targetUrl')}) as targetUrl
      FROM ${dataset}
      ${where}
    `
    const timeseriesSql = `
      SELECT
        formatDateTime(FROM_UNIXTIME(${getField('timestamp')}/1000), '${intervalFormat}', '${sanitizeSqlInput(query.timezone)}') as timeLabel,
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${dataset}
      ${where}
      GROUP BY timeLabel
      ORDER BY timeLabel
      LIMIT ${query.limit}
    `
    const countriesSql = `
      SELECT
        ${buildSelectFields({ country: 'country' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${dataset}
      ${where}
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `
    const referrersSql = `
      SELECT
        ${buildSelectFields({ referrer: 'referer' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${dataset}
      ${where}
      AND ${getField('referer')} != 'direct'
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `
    const devicesSql = `
      SELECT
        ${buildSelectFields({ deviceType: 'deviceType', os: 'os', browser: 'browser' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${dataset}
      ${where}
      GROUP BY deviceType, os, browser
      ORDER BY clicks DESC
      LIMIT 10
    `
    const browsersSql = `
      SELECT
        ${buildSelectFields({ browser: 'browser', browserVersion: 'browserVersion' })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${dataset}
      ${where}
      GROUP BY browser, browserVersion
      ORDER BY clicks DESC
      LIMIT 10
    `

    const [
      { data: overviewResult },
      { data: timeseriesResult },
      { data: countriesResult },
      { data: referrersResult },
      { data: devicesResult },
      { data: browsersResult },
    ] = await Promise.all([
      executeQuery(c.env, overviewSql),
      executeQuery(c.env, timeseriesSql),
      executeQuery(c.env, countriesSql),
      executeQuery(c.env, referrersSql),
      executeQuery(c.env, devicesSql),
      executeQuery(c.env, browsersSql),
    ])

    const overviewData = overviewResult[0]
    if (!overviewData || Number(overviewData.totalClicks) === 0) {
      return c.json<ApiResponse>(
        { code: 404, message: 'No analytics data found for this hash' },
        404,
      )
    }

    return c.json<ApiResponse>({
      code: 0,
      message: 'success',
      data: {
        linkInfo: {
          hash,
          shortCode: overviewData.shortCode,
          domain: overviewData.domain,
          targetUrl: overviewData.targetUrl,
        },
        overview: {
          totalClicks: overviewData.totalClicks || 0,
          uniqueVisitors: overviewData.uniqueVisitors || 0,
          firstClick: overviewData.firstClick,
          lastClick: overviewData.lastClick,
        },
        timeseries: timeseriesResult,
        topCountries: countriesResult,
        topReferrers: referrersResult,
        topDevices: devicesResult,
        topBrowsers: browsersResult,
      },
    })
  },
)

// GET /api/analytics/real-time
analyticsRoutes.get('/real-time', async (c) => {
  ensureAnalyticsAvailable(c.env)
  const requestId = c.get('requestId')
  logger.info(`[${requestId}] Real-time analytics requested`)

  const last24h = Date.now() - 24 * 60 * 60 * 1000
  const sql = `
    SELECT
      ${buildSelectFields({
        shortCode: 'shortCode',
        country: 'country',
        deviceType: 'deviceType',
        timestamp: 'timestamp',
      })},
      SUM(_sample_interval) as clicks
    FROM ${getDatasetName(c.env)}
    WHERE ${getField('timestamp')} >= ${last24h}
    ORDER BY ${getField('timestamp')} DESC
    LIMIT 100
  `

  const { data: result } = await executeQuery(c.env, sql)

  const recentClicks = result.slice(0, 20).map((r) => ({
    timestamp: r.timestamp,
    shortCode: r.shortCode,
    country: r.country,
    deviceType: r.deviceType,
    clicks: Number.parseInt(r.clicks || '0') || 0,
  }))
  const clicksLast24h = result.reduce(
    (sum, r) => sum + (Number(r.clicks) || 0),
    0,
  )

  return c.json<ApiResponse>({
    code: 0,
    message: 'success',
    data: {
      activeVisitors: 0, // ip is not selected; uniqueness can't be derived here
      clicksLast24h,
      recentClicks,
    },
  })
})

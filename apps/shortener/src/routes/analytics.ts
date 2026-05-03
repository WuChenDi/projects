import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
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

// GET /api/analytics/overview
analyticsRoutes.get(
  '/overview',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Analytics overview requested, query: ${JSON.stringify(query)}`,
    )

    try {
      // Verify Analytics Engine availability
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Build query conditions and execute overview query
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
      SELECT 
        SUM(_sample_interval) as totalClicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors,
        COUNT(DISTINCT ${getField('hash')}) as uniqueLinks,
        COUNT(DISTINCT ${getField('country')}) as uniqueCountries
      FROM ${datasetName} 
      ${whereConditions}
    `

      logger.debug(`Executing analytics overview query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      // Provide default values if no data found
      const data = result[0] || {
        totalClicks: 0,
        uniqueVisitors: 0,
        uniqueLinks: 0,
        uniqueCountries: 0,
      }

      logger.info(
        `[${requestId}] Analytics overview completed, data: ${JSON.stringify(data)}`,
      )

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Analytics overview failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch analytics overview',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/timeseries
analyticsRoutes.get(
  '/timeseries',
  zValidator('query', timeSeriesQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Analytics timeseries requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Prepare time series query with proper formatting
      const intervalFormat = getIntervalFormat(query.interval)
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
        SELECT 
          formatDateTime(FROM_UNIXTIME(${getField('timestamp')}/1000), '${intervalFormat}', '${query.timezone}') as timeLabel,
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY timeLabel
        ORDER BY timeLabel
        LIMIT ${query.limit}
      `

      logger.debug(`Executing analytics timeseries query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Analytics timeseries failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch analytics timeseries',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/top-countries
analyticsRoutes.get(
  '/top-countries',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Top countries analytics requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Query top countries by click volume
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
        SELECT 
          ${buildSelectFields({ country: 'country' })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT ${query.limit}
      `

      logger.debug(`Executing top countries query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Top countries analytics failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch top countries analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/top-referrers
analyticsRoutes.get(
  '/top-referrers',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Top referrers analytics requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Query top referrers excluding direct traffic
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
        SELECT 
          ${buildSelectFields({ referrer: 'referer' })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        AND ${getField('referer')} != 'direct'
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT ${query.limit}
      `

      logger.debug(`Executing top referrers query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Top referrers analytics failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch top referrers analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/devices
analyticsRoutes.get(
  '/devices',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Device analytics requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Multi-dimensional device analysis query
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
      SELECT 
        ${buildSelectFields({
          deviceType: 'deviceType',
          os: 'os',
          browser: 'browser',
        })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${datasetName} 
      ${whereConditions}
      GROUP BY deviceType, os, browser
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

      logger.debug(`Executing device analytics query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Device analytics failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch device analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/browsers
analyticsRoutes.get(
  '/browsers',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Browser analytics requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Browser usage analysis with version breakdown
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
      SELECT 
        ${buildSelectFields({
          browser: 'browser',
          browserVersion: 'browserVersion',
        })},
        SUM(_sample_interval) as clicks,
        COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
      FROM ${datasetName} 
      ${whereConditions}
      GROUP BY browser, browserVersion
      ORDER BY clicks DESC
      LIMIT ${query.limit}
    `

      logger.debug(`Executing browser analytics query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Browser analytics failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch browser analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/operating-systems
analyticsRoutes.get(
  '/operating-systems',
  zValidator('query', analyticsQuerySchema),
  async (c) => {
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Operating systems analytics requested, query: ${JSON.stringify(query)}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Operating system usage analysis
      const whereConditions = buildWhereConditions(query)
      const datasetName = getDatasetName(c.env)

      const sql = `
        SELECT 
          ${buildSelectFields({ os: 'os' })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY os
        ORDER BY clicks DESC
        LIMIT ${query.limit}
      `

      logger.debug(`Executing operating systems analytics query, sql: ${sql}`)
      const { data: result } = await executeQuery(c.env, sql)

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: result,
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Operating systems analytics failed, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch operating systems analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/link/:hash
analyticsRoutes.get(
  '/link/:hash',
  zValidator('query', timeSeriesQuerySchema),
  async (c) => {
    const hash = c.req.param('hash')
    const query = c.req.valid('query')
    const requestId = c.get('requestId')

    logger.info(
      `[${requestId}] Link-specific analytics requested, ${JSON.stringify({
        hash,
        ...query,
      })}`,
    )

    try {
      if (!c.env.ANALYTICS) {
        return c.json<ApiResponse>(
          {
            code: 503,
            message: 'Analytics Engine not available',
          },
          503,
        )
      }

      // Prepare hash-based filtering conditions
      const whereConditions = `WHERE ${getField('hash')} = '${sanitizeSqlInput(hash)}'`
      const datasetName = getDatasetName(c.env)
      const intervalFormat = getIntervalFormat(query.interval)

      // Overview query with link metadata
      const overviewSql = `
        SELECT 
          SUM(_sample_interval) as totalClicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors,
          MIN(${getField('timestamp')}) as firstClick,
          MAX(${getField('timestamp')}) as lastClick,
          ANY_VALUE(${getField('shortCode')}) as shortCode,
          ANY_VALUE(${getField('domain')}) as domain,
          ANY_VALUE(${getField('targetUrl')}) as targetUrl
        FROM ${datasetName} 
        ${whereConditions}
      `

      // Time series analysis for trend visualization
      const timeseriesSql = `
        SELECT 
          formatDateTime(FROM_UNIXTIME(${getField('timestamp')}/1000), '${intervalFormat}', '${query.timezone}') as timeLabel,
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY timeLabel
        ORDER BY timeLabel
        LIMIT ${query.limit}
      `

      // Geographic distribution analysis
      const countriesSql = `
        SELECT 
          ${buildSelectFields({ country: 'country' })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 10
      `

      // Traffic source analysis (excluding direct traffic)
      const referrersSql = `
        SELECT 
          ${buildSelectFields({ referrer: 'referer' })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        AND ${getField('referer')} != 'direct'
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10
      `

      // Device type breakdown analysis
      const devicesSql = `
        SELECT 
          ${buildSelectFields({
            deviceType: 'deviceType',
            os: 'os',
            browser: 'browser',
          })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY deviceType, os, browser
        ORDER BY clicks DESC
        LIMIT 10
      `

      // Browser usage breakdown analysis
      const browsersSql = `
        SELECT 
          ${buildSelectFields({
            browser: 'browser',
            browserVersion: 'browserVersion',
          })},
          SUM(_sample_interval) as clicks,
          COUNT(DISTINCT ${getField('ip')}) as uniqueVisitors
        FROM ${datasetName} 
        ${whereConditions}
        GROUP BY browser, browserVersion
        ORDER BY clicks DESC
        LIMIT 10
      `

      logger.debug(
        `Executing comprehensive link analytics queries, hash: ${hash}`,
      )

      // Execute all queries in parallel for optimal performance
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

      // Return 404 if no analytics data exists for this hash
      if (!overviewData || Number(overviewData.totalClicks) === 0) {
        return c.json<ApiResponse>(
          {
            code: 404,
            message: 'No analytics data found for this hash',
          },
          404,
        )
      }

      // Structure overview metrics
      const overview = {
        totalClicks: overviewData.totalClicks || 0,
        uniqueVisitors: overviewData.uniqueVisitors || 0,
        firstClick: overviewData.firstClick,
        lastClick: overviewData.lastClick,
      }

      // Structure link information
      const linkInfo = {
        hash,
        shortCode: overviewData.shortCode,
        domain: overviewData.domain,
        targetUrl: overviewData.targetUrl,
      }

      return c.json<ApiResponse>({
        code: 0,
        message: 'success',
        data: {
          linkInfo,
          overview,
          timeseries: timeseriesResult,
          topCountries: countriesResult,
          topReferrers: referrersResult,
          topDevices: devicesResult,
          topBrowsers: browsersResult,
        },
      })
    } catch (error) {
      logger.error(
        `[${requestId}] Link analytics failed, ${JSON.stringify({
          hash,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 500,
          message: 'Failed to fetch link analytics',
        },
        500,
      )
    }
  },
)

// GET /api/analytics/real-time
analyticsRoutes.get('/real-time', async (c) => {
  const requestId = c.get('requestId')

  logger.info(`[${requestId}] Real-time analytics requested`)

  try {
    if (!c.env.ANALYTICS) {
      return c.json<ApiResponse>(
        {
          code: 503,
          message: 'Analytics Engine not available',
        },
        503,
      )
    }

    const datasetName = getDatasetName(c.env)
    const last24h = Date.now() - 24 * 60 * 60 * 1000

    // Query recent activity data for real-time dashboard
    const sql = `
      SELECT 
        ${buildSelectFields({
          shortCode: 'shortCode',
          country: 'country',
          deviceType: 'deviceType',
          timestamp: 'timestamp',
        })},
        SUM(_sample_interval) as clicks
      FROM ${datasetName} 
      WHERE ${getField('timestamp')} >= ${last24h}
      ORDER BY ${getField('timestamp')} DESC
      LIMIT 100
    `

    logger.debug(`Executing real-time analytics query, sql: ${sql}`)
    const { data: result } = await executeQuery(c.env, sql)

    // Process results for real-time dashboard display
    const recentClicks = result.slice(0, 20).map((r) => ({
      timestamp: r.timestamp,
      shortCode: r.shortCode,
      country: r.country,
      deviceType: r.deviceType,
      clicks: Number.parseInt(r.clicks || '0') || 0,
    }))

    // Calculate active metrics (note: IP field not included in SELECT, using approximation)
    const activeVisitors = new Set(result.filter((r) => r.ip).map((r) => r.ip))
      .size
    const clicksLast24h = result.reduce(
      (sum, r) => sum + (Number(r.clicks) || 0),
      0,
    )

    return c.json<ApiResponse>({
      code: 0,
      message: 'success',
      data: {
        activeVisitors,
        clicksLast24h,
        recentClicks,
      },
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Real-time analytics failed, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )
    return c.json<ApiResponse>(
      {
        code: 500,
        message: 'Failed to fetch real-time analytics',
      },
      500,
    )
  }
})

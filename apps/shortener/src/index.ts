import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger as accesslog } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { requestId } from 'hono/request-id'
import { cleanupExpiredLinks } from '@/cron/cleanup'
import { jwtMiddleware } from '@/middleware/jwt'
import { aiRoutes, analyticsRoutes, apiRoutes, shortCodeRoutes } from '@/routes'
import type { CloudflareEnv, Variables } from '@/types'
import './global'

const app = new Hono<{ Bindings: CloudflareEnv; Variables: Variables }>()

export const customLogger = (message: string, ...rest: string[]) => {
  logger.info(`[ACCESS] ${message}`, ...rest)
}

// Global middleware
app.use(accesslog(customLogger))
app.use('*', prettyJSON())
app.use('*', requestId())
app.use('*', cors())

// JWT middleware for API routes
app.use('/api/*', jwtMiddleware)

// Routes
app.route('/', shortCodeRoutes)
app.route('/api', apiRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/analytics', analyticsRoutes)

// Global error handler
app.onError((err, c) => {
  logger.error('Global error handler invoked', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    userAgent: c.req.header('user-agent'),
  })

  if (err instanceof HTTPException) {
    logger.warn(`HTTP Exception: ${err.status} - ${err.message}`, {
      status: err.status,
      path: c.req.path,
      method: c.req.method,
    })

    return c.json(
      {
        statusCode: err.status,
        message: err.message,
        stack: isDebug ? err.stack?.split('\n') : undefined,
      },
      err.status,
    )
  }

  logger.error('Unhandled server error', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  })

  return c.json(
    {
      statusCode: 500,
      message: 'Internal Server Error',
      stack: isDebug ? err.stack?.split('\n') : undefined,
    },
    500,
  )
})

// 404 handler
app.notFound((c) => {
  logger.warn(`404 - Route not found: ${c.req.method} ${c.req.path}`, {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
    referer: c.req.header('referer'),
  })

  return c.json(
    {
      statusCode: 404,
      message: 'Not Found',
    },
    404,
  )
})

logger.info('Hono application initialization completed with analytics support')

// Cloudflare Workers scheduled event handler
export default {
  fetch: app.fetch,

  async scheduled(
    event: ScheduledEvent,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    logger.info('Scheduled event triggered', {
      scheduledTime: event.scheduledTime,
      cron: event.cron,
    })

    try {
      // Wait for cleanup task to complete
      ctx.waitUntil(
        (async () => {
          const result = await cleanupExpiredLinks(env)

          logger.info('Scheduled cleanup task completed', {
            deletedCount: result.deletedCount,
            cacheCleanedCount: result.cacheCleanedCount,
            errorCount: result.errors.length,
            executionTimeMs: result.executionTime,
            scheduledTime: event.scheduledTime,
          })

          // Log errors if any
          if (result.errors.length > 0) {
            logger.error('Cleanup task had errors', {
              errors: result.errors.slice(0, 10), // Log first 10 errors
              totalErrors: result.errors.length,
            })
          }
        })(),
      )
    } catch (error) {
      logger.error('Scheduled event handler failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scheduledTime: event.scheduledTime,
        cron: event.cron,
      })
    }
  },
}

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

const accessLogger = (message: string, ...rest: string[]) => {
  logger.info(`[ACCESS] ${message}`, ...rest)
}

app.use(accesslog(accessLogger))
app.use('*', prettyJSON())
app.use('*', requestId())
app.use('*', cors())

// JWT-protected admin routes
app.use('/api/*', jwtMiddleware)

app.route('/', shortCodeRoutes)
app.route('/api', apiRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/analytics', analyticsRoutes)

app.onError((err, c) => {
  const ctx = {
    path: c.req.path,
    method: c.req.method,
    userAgent: c.req.header('user-agent'),
  }

  const status = err instanceof HTTPException ? err.status : 500
  if (err instanceof HTTPException) {
    logger.warn(`HTTP ${err.status}: ${err.message}`, ctx)
  } else {
    logger.error('Unhandled error', {
      ...ctx,
      message: err.message,
      stack: err.stack,
    })
  }

  return c.json(
    {
      // `code` mirrors `statusCode` so legacy clients that read `code` keep working.
      code: status,
      statusCode: status,
      message: err.message,
      stack: isDebug ? err.stack?.split('\n') : undefined,
    },
    status,
  )
})

app.notFound((c) => {
  logger.warn(`404 ${c.req.method} ${c.req.path}`, {
    userAgent: c.req.header('user-agent'),
    referer: c.req.header('referer'),
  })
  return c.json({ code: 404, statusCode: 404, message: 'Not Found' }, 404)
})

logger.info('Hono application initialization completed')

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

    ctx.waitUntil(
      (async () => {
        const result = await cleanupExpiredLinks(env)
        logger.info('Scheduled cleanup task completed', {
          deletedCount: result.deletedCount,
          cacheCleanedCount: result.cacheCleanedCount,
          errorCount: result.errors.length,
          executionTimeMs: result.executionTime,
        })
        if (result.errors.length > 0) {
          logger.error('Cleanup task had errors', {
            errors: result.errors.slice(0, 10),
            totalErrors: result.errors.length,
          })
        }
      })(),
    )
  },
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger as accesslog } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { requestId } from 'hono/request-id'
import { cleanupExpiredContent } from '@/cron/cleanup'
import {
  chestRoutes,
  configRoutes,
  downloadRoutes,
  emailRoutes,
  retrieveRoutes,
} from '@/routes'
import type { CloudflareEnv } from '@/types'
import './global'

const app = new Hono<{ Bindings: CloudflareEnv }>()

export const customLogger = (message: string, ...rest: string[]) => {
  logger.info(`[ACCESS] ${message}`, ...rest)
}

// Global middleware
app.use(accesslog(customLogger))
app.use('*', prettyJSON())
app.use('*', requestId())
app.use('*', cors())

// Routes
app.route('/api', configRoutes)
app.route('/api', chestRoutes)
app.route('/api', retrieveRoutes)
app.route('/api', downloadRoutes)
app.route('/api', emailRoutes)

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    platform: 'cloudflare-workers',
    version: '1.0.0',
    message: '',
    description: '',
    timestamp: new Date().toISOString(),
  })
})

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
      const result = await cleanupExpiredContent(env)
      logger.info('Cleanup completed successfully', result)
    } catch (error) {
      logger.error('Scheduled event handler failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scheduledTime: event.scheduledTime,
        cron: event.cron,
      })
    }
  },
}

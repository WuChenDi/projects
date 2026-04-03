import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { homeRoutes, sdkRoutes, wsRoutes } from '@/routes'
import type { AppEnv } from '@/types'

export { SiteManager } from './site-manager'

const app = new Hono<{ Bindings: AppEnv }>()

// Global middleware
app.use(logger())
app.use('*', requestId())

// Routes
app.route('/', homeRoutes)
app.route('/', sdkRoutes)
app.route('/', wsRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ statusCode: 404, message: 'Not Found' }, 404)
})

export default { fetch: app.fetch }

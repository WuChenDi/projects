import { Hono } from 'hono'
import type { AppEnv } from '@/types'

export const wsRoutes = new Hono<{ Bindings: AppEnv }>()

wsRoutes.get('/ws', async (c) => {
  const siteId = c.req.query('siteId') || 'default-site'
  const clientId = c.req.query('clientId') || crypto.randomUUID()
  const enableTotalCount = c.req.query('enableTotalCount') === 'true'

  const id = c.env.SITE_MANAGER.idFromName(siteId)
  const stub = c.env.SITE_MANAGER.get(id)

  const url = new URL(c.req.url)
  url.pathname = '/ws'
  url.searchParams.set('clientId', clientId)
  url.searchParams.set('enableTotalCount', enableTotalCount.toString())

  return stub.fetch(url.toString(), c.req.raw)
})

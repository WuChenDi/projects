import { Hono } from 'hono'
import { HomePage } from '@/pages/HomePage'
import type { AppEnv } from '@/types'

export const homeRoutes = new Hono<{ Bindings: AppEnv }>()

homeRoutes.get('/', (c) => {
  return c.html(<HomePage url={new URL(c.req.url).origin} />)
})

import { Bot, webhookCallback } from 'grammy'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { BaccaratGameRoom } from '@/durable-objects/game-room'
import { registerCommands } from '@/handlers/commands'
import { createRoutes } from '@/handlers/routes'
import type { Env } from '@/types'
import { createConfig } from '@/types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// Webhook handler - needs Bot with commands registered
app.post('/webhook', async (c) => {
  const bot = new Bot(c.env.BOT_TOKEN)
  const config = createConfig(c.env)
  registerCommands(bot, c.env, config)
  const handler = webhookCallback(bot, 'hono')
  return handler(c)
})

// Mount API routes
app.route('/', createRoutes())

// 404
app.notFound((c) => c.json({ statusCode: 404, message: 'Not Found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('[Worker] Error:', err)
  return c.json({ statusCode: 500, message: 'Internal Server Error' }, 500)
})

export default { fetch: app.fetch }
export { BaccaratGameRoom }

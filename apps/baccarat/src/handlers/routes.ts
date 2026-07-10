import { Bot } from 'grammy'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { sendMessage, setWebhook } from '@/lib/bot'
import type { Env } from '@/types'
import { createConfig } from '@/types'

export function validateChatId(env: Env, chatId: string): boolean {
  const allowedChatIds = env.ALLOWED_CHAT_IDS?.split(',').map((id: string) =>
    id.trim(),
  )
  if (allowedChatIds && !allowedChatIds.includes(chatId)) {
    return false
  }
  return true
}

function requireApiSecret(c: Context<{ Bindings: Env }>): Response | null {
  const secret = c.env.API_SECRET
  if (!secret) return null // no secret configured, skip check
  const provided = c.req.header('X-API-Key') || c.req.query('api_key')
  if (provided !== secret) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return null
}

async function proxyToGameRoom(
  c: Context<{ Bindings: Env }>,
  doPath: string,
): Promise<Response> {
  try {
    const chatId = c.req.param('chatId')

    if (!validateChatId(c.env, chatId)) {
      return c.json({ error: 'Chat ID not allowed' }, 403)
    }

    if (!c.env.GAME_ROOMS) {
      return c.json({ error: 'Game rooms not configured' }, 500)
    }

    const roomId = c.env.GAME_ROOMS.idFromName(chatId)
    const room = c.env.GAME_ROOMS.get(roomId)

    let requestBody: any = {}
    if (c.req.method === 'POST') {
      try {
        requestBody = await c.req.json()
      } catch {
        // No body provided, use empty object
      }
      requestBody.chatId = chatId
    }

    const response = await room.fetch(
      new Request(`https://game.room${doPath}`, {
        method: c.req.method,
        headers: { 'Content-Type': 'application/json' },
        body: c.req.method === 'POST' ? JSON.stringify(requestBody) : undefined,
      }),
    )

    const result = await response.json()
    return c.json(result, response.status)
  } catch (error) {
    console.error('[Routes] Failed to proxy to game room:', error)
    return c.json(
      {
        error: 'Failed to proxy to game room',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
}

export function createRoutes(): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>()

  // Root info
  app.get('/', (c) => {
    const config = createConfig(c.env)
    return c.json({
      message: 'Baccarat Bot with Hono and Durable Objects!',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: [
        'Full Telegram command support',
        'Direct API call functionality',
        'Auto game mode',
        'Real-time betting and status queries',
        'Game history records',
      ],
      config: {
        bettingDuration: `${config.bettingDurationMs / 1000}s`,
        autoGameInterval: `${config.autoGameIntervalMs / 1000}s`,
        diceAnimationWait: `${config.diceAnimationWaitMs / 1000}s`,
      },
    })
  })

  // Health check
  app.get('/health', (c) => {
    try {
      const config = createConfig(c.env)
      return c.json({
        status: 'ok',
        platform: 'cloudflare-workers',
        timestamp: new Date().toISOString(),
        config: {
          bettingDurationMs: config.bettingDurationMs,
          autoGameIntervalMs: config.autoGameIntervalMs,
          diceAnimationWaitMs: config.diceAnimationWaitMs,
          globalProcessTimeoutMs: config.globalProcessTimeoutMs,
        },
        commandsEnabled: true,
      })
    } catch (error) {
      return c.json(
        {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        500,
      )
    }
  })

  // Game history (proxied to DO since data lives in DO SQLite)
  app.get('/game-history/:chatId', (c) => {
    const rawLimit = parseInt(c.req.query('limit') || '10')
    const limit = Math.min(Math.max(1, rawLimit || 10), 100)
    const chatId = c.req.param('chatId')
    return proxyToGameRoom(c, `/game-history?limit=${limit}&chatId=${chatId}`)
  })

  // Game detail (proxied to DO)
  app.get('/game-detail/:gameNumber', async (c) => {
    const gameNumber = c.req.param('gameNumber')
    const chatId = c.req.query('chatId')

    if (!chatId) {
      return c.json(
        { success: false, error: 'chatId query parameter is required' },
        400,
      )
    }

    if (!/^\d+$/.test(gameNumber)) {
      return c.json(
        {
          success: false,
          error: 'Invalid game number format. Expected numeric digits.',
        },
        400,
      )
    }

    // Route to the DO for this chatId
    try {
      if (!validateChatId(c.env, chatId)) {
        return c.json({ error: 'Chat ID not allowed' }, 403)
      }
      const roomId = c.env.GAME_ROOMS.idFromName(chatId)
      const room = c.env.GAME_ROOMS.get(roomId)
      const response = await room.fetch(
        new Request(`https://game.room/game-detail?gameNumber=${gameNumber}`),
      )
      const result = await response.json()
      return c.json(result as Record<string, unknown>, response.status as 200)
    } catch (error) {
      console.error('[Routes] Failed to get game detail:', error)
      return c.json(
        {
          error: 'Failed to get game detail',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500,
      )
    }
  })

  // DO proxy routes - forward to Durable Object (require API secret)
  app.post('/auto-game/:chatId', (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    return proxyToGameRoom(c, '/start-game')
  })
  app.post('/enable-auto/:chatId', (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    return proxyToGameRoom(c, '/enable-auto')
  })
  app.post('/disable-auto/:chatId', (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    return proxyToGameRoom(c, '/disable-auto')
  })
  app.post('/process-game/:chatId', (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    return proxyToGameRoom(c, '/process-game')
  })
  app.get('/game-status/:chatId', (c) => proxyToGameRoom(c, '/get-status'))
  app.post('/place-bet/:chatId', (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    return proxyToGameRoom(c, '/place-bet')
  })

  // Send message (require API secret)
  app.post('/send-message', async (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied
    try {
      const { chatId, message, parseMode } = await c.req.json()

      if (!chatId || !message) {
        return c.json({ error: 'chatId and message are required' }, 400)
      }

      if (!validateChatId(c.env, chatId.toString())) {
        return c.json({ error: 'Chat ID not allowed' }, 403)
      }

      const bot = new Bot(c.env.BOT_TOKEN)
      const result = await sendMessage(
        bot,
        chatId,
        message,
        parseMode || 'Markdown',
      )

      if (result.success) {
        return c.json({
          success: true,
          messageId: result.messageId,
          timestamp: new Date().toISOString(),
        })
      } else {
        return c.json(
          {
            success: false,
            error: result.error,
          },
          500,
        )
      }
    } catch (error) {
      console.error('[Routes] Failed to send message:', error)
      return c.json(
        {
          error: 'Failed to send message',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500,
      )
    }
  })

  // Set webhook (require API secret)
  app.post('/set-webhook', async (c) => {
    const denied = requireApiSecret(c)
    if (denied) return denied

    try {
      const { url } = await c.req.json()
      if (!url) {
        return c.json({ error: 'webhook url is required' }, 400)
      }

      try {
        new URL(url)
      } catch {
        return c.json({ error: 'Invalid webhook URL format' }, 400)
      }

      const bot = new Bot(c.env.BOT_TOKEN)
      const result = await setWebhook(bot, url)

      if (result.success) {
        return c.json({
          success: true,
          message: 'Webhook set successfully',
          url,
          timestamp: new Date().toISOString(),
        })
      } else {
        return c.json(
          {
            success: false,
            error: result.error,
          },
          500,
        )
      }
    } catch (error) {
      console.error('[Routes] Failed to set webhook:', error)
      return c.json(
        {
          error: 'Failed to set webhook',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500,
      )
    }
  })

  // Config
  app.get('/config', (c) => {
    const config = createConfig(c.env)

    return c.json({
      success: true,
      config: {
        bettingDurationMs: config.bettingDurationMs,
        autoGameIntervalMs: config.autoGameIntervalMs,
        diceAnimationWaitMs: config.diceAnimationWaitMs,
        diceResultDelayMs: config.diceResultDelayMs,
        messageDelayMs: config.messageDelayMs,
        globalProcessTimeoutMs: config.globalProcessTimeoutMs,
        cleanupDelayMs: config.cleanupDelayMs,
        humanReadable: {
          bettingDuration: `${config.bettingDurationMs / 1000}s`,
          autoGameInterval: `${config.autoGameIntervalMs / 1000}s`,
          diceAnimationWait: `${config.diceAnimationWaitMs / 1000}s`,
          globalProcessTimeout: `${config.globalProcessTimeoutMs / 1000}s`,
        },
      },
      timestamp: new Date().toISOString(),
    })
  })

  return app
}

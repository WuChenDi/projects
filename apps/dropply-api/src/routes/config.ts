import { Hono } from 'hono'
import type { ApiResponse, CloudflareEnv, ConfigResponse } from '@/types'

export const configRoutes = new Hono<{ Bindings: CloudflareEnv }>()

// GET /config
const DEFAULT_MAX_FILE_SIZE_MB = 100

configRoutes.get('/config', async (c) => {
  const mb = c.env.MAX_FILE_SIZE_MB
    ? Number.parseInt(c.env.MAX_FILE_SIZE_MB, 10)
    : DEFAULT_MAX_FILE_SIZE_MB
  const maxFileSize = mb * 1024 * 1024

  return c.json<ApiResponse<ConfigResponse>>({
    code: 0,
    message: 'ok',
    data: {
      requireTOTP: c.env.REQUIRE_TOTP === 'true',
      emailShareEnabled: !!(
        c.env.RESEND_API_KEY && c.env.ENABLE_EMAIL_SHARE === 'true'
      ),
      maxFileSize,
    },
  })
})

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import type * as z from 'zod'
import type { SessionUser } from '@/lib/platform/auth'
import { requireSession } from '@/lib/platform/auth'
import { logger } from '@/lib/platform/logger'

type CloudflareEnv = ReturnType<typeof getCloudflareContext>['env']

// Everything a withAuth handler needs that the wrapper already resolved: the
// signed-in user, the raw request (for URL/host/ip), and the Cloudflare env.
export interface AuthContext {
  user: SessionUser
  request: Request
  env: CloudflareEnv
}

// Typed error a handler can throw to short-circuit with a specific status. The
// top-level catch in withAuth maps it to the standard { error } envelope.
export class ApiError extends Error {
  readonly statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

// Wraps a mutation route handler with the shared session-gate + body-validation
// + error-envelope boilerplate (ARC-03). The handler runs only after the
// session passes and the body validates; a thrown ApiError maps to its status,
// and any other throw is logged and returned as a uniform 500 envelope instead
// of Next's default. Handlers keep returning their own success/business
// responses unchanged.
export function withAuth<T>(
  schema: z.ZodType<T>,
  handler: (data: T, ctx: AuthContext) => Promise<NextResponse>,
  invalidMessage = 'Invalid payload',
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const auth = await requireSession(request)
      if (!auth.ok) return auth.response

      const parsed = schema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json(
          { error: invalidMessage, issues: parsed.error.issues },
          { status: 400 },
        )
      }

      const { env } = getCloudflareContext()
      return await handler(parsed.data, { user: auth.user, request, env })
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode },
        )
      }
      logger.error('Unhandled API error', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      )
    }
  }
}

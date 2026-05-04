import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://floxx.pages.dev',
  'http://flox.localhost:3355',
]

/**
 * CORS Proxy (using middleware.ts instead of proxy.ts)
 *
 * Next.js 16 renamed middleware.ts to proxy.ts, but Cloudflare Pages'
 * next-on-pages does not yet support the new proxy.ts convention,
 * so middleware.ts must be used for now.
 *
 * Migrate to proxy.ts once next-on-pages adds support.
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') ?? ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const res = NextResponse.next()
  if (isAllowed) {
    res.headers.set('Access-Control-Allow-Origin', origin)
  }
  return res
}

export const config = {
  matcher: '/api/:path*',
}

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { globalConfig } from '@/database/schema'
import { getDb } from '@/lib/db'

type AuthResult = { ok: true } | { ok: false; response: NextResponse }

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export async function requireBearer(request: Request): Promise<AuthResult> {
  const auth = request.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/u)
  if (!match) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing bearer token' },
        { status: 401 },
      ),
    }
  }
  const token = match[1].trim()
  const db = await getDb()
  const rows = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)
  const configToken = rows[0]?.pushApiToken || ''
  if (!configToken || token !== configToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 },
      ),
    }
  }
  return { ok: true }
}

// Browser fetch always sets `Origin` for cross-origin requests AND for most
// POSTs — so a same-origin POST from the UI is identifiable here. External
// API consumers (curl, cron) typically omit Origin and must use Bearer.
export async function requireBearerOrSameOrigin(
  request: Request,
): Promise<AuthResult> {
  if (isSameOriginRequest(request)) return { ok: true }
  return requireBearer(request)
}

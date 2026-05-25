import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { globalConfig } from '@/database/schema'
import { getDb } from '@/lib/db'

export async function requireBearer(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
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
  const db = getDb()
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

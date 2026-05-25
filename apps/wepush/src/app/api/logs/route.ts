import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushLogs, users } from '@/database/schema'
import { getDb } from '@/lib/db'

const STATUS_VALUES = new Set(['success', 'failed'])

function parseInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const userId = sp.get('userId') || undefined
  const status = sp.get('status') || undefined
  const batchId = sp.get('batchId') || undefined
  const from = sp.get('from') || undefined
  const to = sp.get('to') || undefined
  const limit = Math.min(Math.max(parseInt(sp.get('limit'), 50), 1), 200)
  const offset = Math.max(parseInt(sp.get('offset'), 0), 0)

  const filters = [eq(pushLogs.isDeleted, 0)]
  if (userId) filters.push(eq(pushLogs.userId, userId))
  if (status && STATUS_VALUES.has(status)) {
    filters.push(eq(pushLogs.status, status as 'success' | 'failed'))
  }
  if (batchId) filters.push(eq(pushLogs.batchId, batchId))
  if (from) {
    const d = new Date(from)
    if (!Number.isNaN(d.getTime())) filters.push(gte(pushLogs.sentAt, d))
  }
  if (to) {
    const d = new Date(to)
    if (!Number.isNaN(d.getTime())) {
      // YYYY-MM-DD inputs parse to 00:00:00; treat as inclusive end-of-day so
      // logs from the same date are not silently dropped.
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setHours(23, 59, 59, 999)
      filters.push(lte(pushLogs.sentAt, d))
    }
  }

  const db = await getDb()
  const where = and(...filters)

  const rows = await db
    .select({
      id: pushLogs.id,
      batchId: pushLogs.batchId,
      userId: pushLogs.userId,
      userName: users.name,
      templateCode: pushLogs.templateCode,
      status: pushLogs.status,
      renderedTitle: pushLogs.renderedTitle,
      errorMessage: pushLogs.errorMessage,
      sentAt: pushLogs.sentAt,
    })
    .from(pushLogs)
    .leftJoin(users, eq(users.id, pushLogs.userId))
    .where(where)
    .orderBy(desc(pushLogs.sentAt))
    .limit(limit)
    .offset(offset)

  const [{ count = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)`.as('count') })
    .from(pushLogs)
    .where(where)

  return NextResponse.json({ rows, total: Number(count), limit, offset })
}

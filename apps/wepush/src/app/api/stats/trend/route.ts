import { and, eq, gte } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushLogs } from '@/database/schema'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(30, Math.max(1, Number(searchParams.get('days') ?? 7)))

  const db = await getDb()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const logs = await db
    .select({ status: pushLogs.status, sentAt: pushLogs.sentAt })
    .from(pushLogs)
    .where(and(eq(pushLogs.isDeleted, 0), gte(pushLogs.sentAt, cutoff)))

  // Group by calendar day in CST (UTC+8)
  const byDay = new Map<string, { total: number; success: number }>()
  for (const log of logs) {
    const cst = new Date(log.sentAt.getTime() + 8 * 60 * 60 * 1000)
    const day = cst.toISOString().slice(0, 10)
    const existing = byDay.get(day) ?? { total: 0, success: 0 }
    existing.total++
    if (log.status === 'success') existing.success++
    byDay.set(day, existing)
  }

  // Build complete date range anchored to today (CST)
  const nowCst = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const result = Array.from({ length: days }, (_, i) => {
    const d = new Date(nowCst)
    d.setUTCDate(d.getUTCDate() - (days - 1 - i))
    const date = d.toISOString().slice(0, 10)
    const row = byDay.get(date)
    const total = row?.total ?? 0
    const success = row?.success ?? 0
    return { date, total, success, failed: total - success }
  })

  return NextResponse.json({ days: result })
}

import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { pushBatches, pushLogs, templates, users } from '@/database/schema'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = await getDb()
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    [{ value: userTotal = 0 } = { value: 0 }],
    [{ value: userEnabled = 0 } = { value: 0 }],
    [{ value: templateTotal = 0 } = { value: 0 }],
    [{ value: logs24h = 0 } = { value: 0 }],
    [{ value: success24h = 0 } = { value: 0 }],
    recentBatches,
  ] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)`.as('value') })
      .from(users)
      .where(eq(users.isDeleted, 0)),
    db
      .select({ value: sql<number>`count(*)`.as('value') })
      .from(users)
      .where(and(eq(users.isDeleted, 0), eq(users.enabled, true))),
    db
      .select({ value: sql<number>`count(*)`.as('value') })
      .from(templates)
      .where(eq(templates.isDeleted, 0)),
    db
      .select({ value: sql<number>`count(*)`.as('value') })
      .from(pushLogs)
      .where(and(eq(pushLogs.isDeleted, 0), gte(pushLogs.sentAt, dayAgo))),
    db
      .select({ value: sql<number>`count(*)`.as('value') })
      .from(pushLogs)
      .where(
        and(
          eq(pushLogs.isDeleted, 0),
          gte(pushLogs.sentAt, dayAgo),
          eq(pushLogs.status, 'success'),
        ),
      ),
    db
      .select()
      .from(pushBatches)
      .where(eq(pushBatches.isDeleted, 0))
      .orderBy(desc(pushBatches.startedAt))
      .limit(5),
  ])

  const total24h = Number(logs24h)
  const successCount24h = Number(success24h)
  const successRate =
    total24h === 0 ? null : Math.round((successCount24h / total24h) * 100)

  return NextResponse.json({
    users: { total: Number(userTotal), enabled: Number(userEnabled) },
    templates: { total: Number(templateTotal) },
    logs24h: {
      total: total24h,
      success: successCount24h,
      failed: total24h - successCount24h,
      successRate,
    },
    recentBatches,
  })
}

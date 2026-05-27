import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushBatches, pushLogs } from '@/database/schema'
import { requireBearerOrSameOrigin } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { runPush } from '@/services/push/runner'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearerOrSameOrigin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const db = await getDb()

  const [batch] = await db
    .select()
    .from(pushBatches)
    .where(eq(pushBatches.id, id))
    .limit(1)
  if (!batch) {
    return NextResponse.json({ error: '批次不存在' }, { status: 404 })
  }

  const failedLogs = await db
    .select({ userId: pushLogs.userId })
    .from(pushLogs)
    .where(
      and(
        eq(pushLogs.batchId, id),
        eq(pushLogs.status, 'failed'),
        eq(pushLogs.isDeleted, 0),
      ),
    )

  const userIds = [...new Set(failedLogs.map((l) => l.userId))]
  if (userIds.length === 0) {
    return NextResponse.json({ error: '没有失败记录可重推' }, { status: 400 })
  }

  const result = await runPush({ trigger: 'manual', userIds })
  return NextResponse.json(result)
}

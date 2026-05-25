import { desc, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushBatches, pushLogs, users } from '@/database/schema'
import { getDb } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = getDb()
  const [batch] = await db
    .select()
    .from(pushBatches)
    .where(eq(pushBatches.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const logs = await db
    .select({
      id: pushLogs.id,
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
    .where(eq(pushLogs.batchId, id))
    .orderBy(desc(pushLogs.sentAt))

  return NextResponse.json({ batch, logs })
}

import { and, desc, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushBatches, pushLogs, users } from '@/database/schema'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession(req)
  if (!auth.ok) return auth.response
  const { id } = await params
  const db = await getDb()
  const [batch] = await db
    .select()
    .from(pushBatches)
    .where(and(eq(pushBatches.id, id), eq(pushBatches.ownerId, auth.user.id)))
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
    .where(and(eq(pushLogs.batchId, id), eq(pushLogs.ownerId, auth.user.id)))
    .orderBy(desc(pushLogs.sentAt))

  return NextResponse.json({ batch, logs })
}

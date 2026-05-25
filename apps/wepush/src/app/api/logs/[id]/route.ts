import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { pushLogs, users } from '@/database/schema'
import { getDb } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = getDb()
  const [row] = await db
    .select({
      id: pushLogs.id,
      batchId: pushLogs.batchId,
      userId: pushLogs.userId,
      userName: users.name,
      templateCode: pushLogs.templateCode,
      status: pushLogs.status,
      renderedTitle: pushLogs.renderedTitle,
      renderedDesc: pushLogs.renderedDesc,
      variableSnapshot: pushLogs.variableSnapshot,
      errorMessage: pushLogs.errorMessage,
      errorPayload: pushLogs.errorPayload,
      sentAt: pushLogs.sentAt,
      createdAt: pushLogs.createdAt,
    })
    .from(pushLogs)
    .leftJoin(users, eq(users.id, pushLogs.userId))
    .where(eq(pushLogs.id, id))
    .limit(1)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

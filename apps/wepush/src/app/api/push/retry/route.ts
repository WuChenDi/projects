import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { pushLogs, users } from '@/database/schema'
import { requireBearer } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { runPush } from '@/services/push/runner'

const bodySchema = z.object({ logId: z.string().min(1) }).strict()

export async function POST(request: NextRequest) {
  const auth = await requireBearer(request)
  if (!auth.ok) return auth.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = getDb()
  const [log] = await db
    .select()
    .from(pushLogs)
    .where(eq(pushLogs.id, parsed.data.logId))
    .limit(1)
  if (!log) {
    return NextResponse.json({ error: 'Log 不存在' }, { status: 404 })
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, log.userId), eq(users.isDeleted, 0)))
    .limit(1)
  if (!user) {
    return NextResponse.json({ error: '原用户不存在或已删除' }, { status: 404 })
  }

  const result = await runPush({ trigger: 'manual', userIds: [user.id] })
  return NextResponse.json(result)
}

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { requireOwner } from '@/lib/auth'
import { startPush } from '@/services/push/runner'

const bodySchema = z
  .object({
    userIds: z.array(z.string().min(1)).optional(),
    trigger: z.enum(['manual', 'api', 'cron']).optional(),
  })
  .strict()

export async function POST(request: NextRequest) {
  const auth = await requireOwner(request)
  if (!auth.ok) return auth.response

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const trigger = parsed.data.trigger ?? 'api'
  const result = await startPush({
    ownerId: auth.ownerId,
    trigger,
    userIds: parsed.data.userIds,
  })
  return NextResponse.json(result, { status: 202 })
}

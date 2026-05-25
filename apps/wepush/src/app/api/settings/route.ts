import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { globalConfig } from '@/database/schema'
import { getDb } from '@/lib/db'

function randomToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const patchSchema = z
  .object({
    wechatAppId: z.string().max(64).optional(),
    wechatAppSecret: z.string().max(128).optional(),
    defaultWechatTemplateId: z.string().max(128).optional(),
    maxPushOneMinute: z.number().int().min(1).max(60).optional(),
    sleepTime: z.number().int().min(0).optional(),
    apiTimeout: z.number().int().min(1000).optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    retryDelay: z.number().int().min(0).optional(),
    cronEnabled: z.boolean().optional(),
    cronUserIds: z.array(z.string()).optional(),
    regeneratePushApiToken: z.boolean().optional(),
  })
  .strict()

async function loadOrCreate() {
  const db = getDb()
  const rows = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)

  if (rows[0]) return rows[0]

  await db.insert(globalConfig).values({
    id: 1,
    pushApiToken: randomToken(),
  })

  const fresh = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)
  return fresh[0]!
}

export async function GET() {
  const row = await loadOrCreate()
  return NextResponse.json(row)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  await loadOrCreate()

  const db = getDb()
  const { regeneratePushApiToken, ...rest } = parsed.data
  const updates: Record<string, unknown> = { ...rest }
  if (regeneratePushApiToken) updates.pushApiToken = randomToken()

  await db.update(globalConfig).set(updates).where(eq(globalConfig.id, 1))

  const fresh = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)
  return NextResponse.json(fresh[0])
}

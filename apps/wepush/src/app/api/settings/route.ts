import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { userConfig } from '@/database/schema'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/token'

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

async function loadOrCreate(ownerId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.ownerId, ownerId))
    .limit(1)

  if (rows[0]) return rows[0]

  // Seed the row with a digest of a throwaway token. The raw value is
  // intentionally discarded — the owner regenerates from Settings to obtain a
  // usable token — which keeps the unique index satisfied without ever exposing
  // an un-revealed token. onConflictDoNothing guards the concurrent first
  // GET/PATCH race (both would otherwise insert the same ownerId PK).
  await db
    .insert(userConfig)
    .values({
      ownerId,
      pushApiToken: await hashToken(generateToken()),
    })
    .onConflictDoNothing()

  const fresh = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.ownerId, ownerId))
    .limit(1)
  return fresh[0]!
}

// Strip sensitive fields from the GET response. The settings page no longer
// needs the cleartext; secrets remain editable by sending a new non-empty
// value via PATCH, and pushApiToken is only revealed in the PATCH response
// when regenerated.
function maskRow(row: typeof userConfig.$inferSelect) {
  const { wechatAppSecret, pushApiToken, ...rest } = row
  return {
    ...rest,
    wechatAppSecret: '',
    pushApiToken: '',
    hasWechatAppSecret: Boolean(wechatAppSecret),
    hasPushApiToken: Boolean(pushApiToken),
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const row = await loadOrCreate(auth.user.id)
  return NextResponse.json(maskRow(row))
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response
  const ownerId = auth.user.id

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  await loadOrCreate(ownerId)

  const db = await getDb()
  const { regeneratePushApiToken, wechatAppSecret, ...rest } = parsed.data
  const updates: Record<string, unknown> = { ...rest }
  // Empty wechatAppSecret means "keep existing" — required because GET no
  // longer returns the cleartext, so the form posts back an empty string when
  // the user didn't touch the field.
  if (typeof wechatAppSecret === 'string' && wechatAppSecret.length > 0) {
    updates.wechatAppSecret = wechatAppSecret
  }
  // Persist only the digest; the raw token is revealed once in the response.
  let rawToken = ''
  if (regeneratePushApiToken) {
    rawToken = generateToken()
    updates.pushApiToken = await hashToken(rawToken)
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(userConfig)
      .set(updates)
      .where(eq(userConfig.ownerId, ownerId))
  }

  const fresh = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.ownerId, ownerId))
    .limit(1)
  // Reveal the new raw token only on the rotate response, so the UI can show /
  // copy it once; the row is otherwise masked (wechatAppSecret is never sent in
  // cleartext), and subsequent GETs keep the token masked too.
  if (regeneratePushApiToken) {
    return NextResponse.json({ ...maskRow(fresh[0]!), pushApiToken: rawToken })
  }
  return NextResponse.json(maskRow(fresh[0]!))
}

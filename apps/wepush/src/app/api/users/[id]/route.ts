import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { customDates, festivals, users } from '@/database/schema'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'

const festivalSchema = z.object({
  name: z.string().min(1).max(64),
  date: z.string().regex(/^\d{2}-\d{2}$/u),
  isLunar: z.boolean().default(false),
})

const customDateSchema = z.object({
  keyword: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
})

const patchSchema = z
  .object({
    name: z.string().max(64).optional(),
    wechatOpenId: z.string().max(128).optional(),
    wechatTemplateId: z.string().max(128).optional(),
    templateCode: z.string().max(64).optional(),
    city: z.string().max(64).optional(),
    weatherCityCode: z.string().max(32).optional(),
    horoscopeDate: z
      .string()
      .regex(/^\d{2}-\d{2}$/u)
      .nullable()
      .optional(),
    showColor: z.boolean().optional(),
    enabled: z.boolean().optional(),
    festivals: z.array(festivalSchema).optional(),
    customDates: z.array(customDateSchema).optional(),
  })
  .strict()

async function loadFull(id: string) {
  const db = getDb()
  const u = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.isDeleted, 0)))
    .limit(1)
  if (!u[0]) return null

  const f = await db
    .select()
    .from(festivals)
    .where(and(eq(festivals.userId, id), eq(festivals.isDeleted, 0)))

  const d = await db
    .select()
    .from(customDates)
    .where(and(eq(customDates.userId, id), eq(customDates.isDeleted, 0)))

  return { ...u[0], festivals: f, customDates: d }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const full = await loadFull(id)
  if (!full) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(full)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await loadFull(id)
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = getDb()
  const { festivals: fests, customDates: dates, ...userUpdates } = parsed.data

  if (Object.keys(userUpdates).length > 0) {
    await db.update(users).set(userUpdates).where(eq(users.id, id))
  }

  if (fests) {
    await db.delete(festivals).where(eq(festivals.userId, id))
    if (fests.length > 0) {
      await db
        .insert(festivals)
        .values(
          fests.map((f) => ({ id: String(genid.nextId()), userId: id, ...f })),
        )
    }
  }

  if (dates) {
    await db.delete(customDates).where(eq(customDates.userId, id))
    if (dates.length > 0) {
      await db
        .insert(customDates)
        .values(
          dates.map((d) => ({ id: String(genid.nextId()), userId: id, ...d })),
        )
    }
  }

  const fresh = await loadFull(id)
  return NextResponse.json(fresh)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = getDb()
  await db.update(users).set({ isDeleted: 1 }).where(eq(users.id, id))
  return NextResponse.json({ ok: true })
}

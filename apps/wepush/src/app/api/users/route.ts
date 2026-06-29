import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { customDates, festivals, users } from '@/database/schema'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'

const festivalSchema = z.object({
  name: z.string().min(1).max(64),
  date: z.string().regex(/^\d{2}-\d{2}$/u, 'date 必须为 MM-DD 格式'),
  isLunar: z.boolean().default(false),
})

const customDateSchema = z.object({
  keyword: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'date 必须为 YYYY-MM-DD 格式'),
})

const createSchema = z.object({
  name: z.string().max(64).default(''),
  wechatOpenId: z.string().max(128).default(''),
  wechatTemplateId: z.string().max(128).default(''),
  templateCode: z.string().max(64).default(''),
  city: z.string().max(64).default(''),
  weatherCityCode: z.string().max(32).default(''),
  horoscopeDate: z
    .string()
    .regex(/^\d{2}-\d{2}$/u)
    .nullable()
    .optional(),
  showColor: z.boolean().default(true),
  enabled: z.boolean().default(true),
  festivals: z.array(festivalSchema).default([]),
  customDates: z.array(customDateSchema).default([]),
})

export async function GET(request: NextRequest) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const db = await getDb()
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.ownerId, auth.user.id), eq(users.isDeleted, 0)))
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = await getDb()
  const id = String(genid.nextId())
  const { festivals: fests, customDates: dates, ...userValues } = parsed.data

  await db.insert(users).values({ id, ownerId: auth.user.id, ...userValues })

  if (fests.length > 0) {
    await db
      .insert(festivals)
      .values(
        fests.map((f) => ({ id: String(genid.nextId()), userId: id, ...f })),
      )
  }
  if (dates.length > 0) {
    await db
      .insert(customDates)
      .values(
        dates.map((d) => ({ id: String(genid.nextId()), userId: id, ...d })),
      )
  }

  return NextResponse.json({ id }, { status: 201 })
}

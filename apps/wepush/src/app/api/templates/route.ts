import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { templates } from '@/database/schema'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'

const createSchema = z.object({
  code: z.string().min(1).max(64),
  title: z.string().max(200).default(''),
  desc: z.string().max(20000).default(''),
})

export async function GET() {
  const db = getDb()
  const rows = await db
    .select()
    .from(templates)
    .where(eq(templates.isDeleted, 0))
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = getDb()

  const dup = await db
    .select()
    .from(templates)
    .where(
      and(eq(templates.code, parsed.data.code), eq(templates.isDeleted, 0)),
    )
    .limit(1)
  if (dup[0]) {
    return NextResponse.json(
      { error: 'Template code already exists' },
      { status: 409 },
    )
  }

  const id = String(genid.nextId())
  await db.insert(templates).values({ id, ...parsed.data })
  const fresh = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1)
  return NextResponse.json(fresh[0], { status: 201 })
}

import { and, eq, ne } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { templates } from '@/database/schema'
import { getDb } from '@/lib/db'

const patchSchema = z
  .object({
    code: z.string().min(1).max(64).optional(),
    title: z.string().max(200).optional(),
    desc: z.string().max(20000).optional(),
  })
  .strict()

async function loadOne(id: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.isDeleted, 0)))
    .limit(1)
  return rows[0]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const row = await loadOne(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await loadOne(id)
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

  const db = await getDb()

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.code, parsed.data.code),
          eq(templates.isDeleted, 0),
          ne(templates.id, id),
        ),
      )
      .limit(1)
    if (dup[0]) {
      return NextResponse.json(
        { error: 'Template code already exists' },
        { status: 409 },
      )
    }
  }

  await db.update(templates).set(parsed.data).where(eq(templates.id, id))
  const fresh = await loadOne(id)
  return NextResponse.json(fresh)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = await getDb()
  await db.update(templates).set({ isDeleted: 1 }).where(eq(templates.id, id))
  return NextResponse.json({ ok: true })
}

import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import {
  customDates,
  festivals,
  templates,
  userConfig,
  users,
} from '@/database/schema'
import { requireSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { aggregateUserData } from '@/services/push/aggregate'
import { renderTemplate } from '@/services/template/render'

const bodySchema = z
  .object({
    userId: z.string().min(1),
    templateCode: z.string().optional(),
    // Draft override: when both title and desc are provided, skip the DB
    // template lookup and render the supplied content directly. Used by the
    // template editor for live preview before saving.
    title: z.string().optional(),
    desc: z.string().optional(),
  })
  .strict()

export async function POST(request: NextRequest) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response
  const ownerId = auth.user.id

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = await getDb()

  const [configRow] = await db
    .select()
    .from(userConfig)
    .where(eq(userConfig.ownerId, ownerId))
    .limit(1)
  if (!configRow) {
    return NextResponse.json(
      { error: '全局配置未初始化，请先打开 /settings' },
      { status: 400 },
    )
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, parsed.data.userId),
        eq(users.ownerId, ownerId),
        eq(users.isDeleted, 0),
      ),
    )
    .limit(1)
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  const hasDraft =
    parsed.data.title !== undefined && parsed.data.desc !== undefined
  let template: { code: string; title: string; desc: string }
  if (hasDraft) {
    template = {
      code: parsed.data.templateCode ?? '(draft)',
      title: parsed.data.title ?? '',
      desc: parsed.data.desc ?? '',
    }
  } else {
    const code = parsed.data.templateCode || user.templateCode
    if (!code) {
      return NextResponse.json(
        { error: '未设置模板（用户 templateCode 与参数都为空）' },
        { status: 400 },
      )
    }
    const [row] = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.ownerId, ownerId),
          eq(templates.code, code),
          eq(templates.isDeleted, 0),
        ),
      )
      .limit(1)
    if (!row) {
      return NextResponse.json(
        { error: `未找到模板 (code=${code})` },
        { status: 404 },
      )
    }
    template = row
  }

  const [fests, dates] = await Promise.all([
    db
      .select()
      .from(festivals)
      .where(and(eq(festivals.userId, user.id), eq(festivals.isDeleted, 0))),
    db
      .select()
      .from(customDates)
      .where(
        and(eq(customDates.userId, user.id), eq(customDates.isDeleted, 0)),
      ),
  ])

  const { data: variables, errors: sourceErrors } = await aggregateUserData(
    {
      id: user.id,
      name: user.name,
      city: user.city,
      weatherCityCode: user.weatherCityCode,
      showColor: user.showColor,
      festivals: fests.map((f) => ({
        name: f.name,
        date: f.date,
        isLunar: f.isLunar,
      })),
      customDates: dates.map((d) => ({ keyword: d.keyword, date: d.date })),
    },
    {
      apiTimeout: configRow.apiTimeout,
      maxRetries: configRow.maxRetries,
      retryDelay: configRow.retryDelay,
    },
  )

  const rendered = renderTemplate(template, variables, {
    showColor: user.showColor,
  })

  return NextResponse.json({
    templateCode: template.code,
    title: rendered.title,
    desc: rendered.desc,
    wechatData: rendered.wechatData,
    variables,
    sourceErrors,
  })
}

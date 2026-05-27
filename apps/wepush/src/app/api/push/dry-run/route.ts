import { and, eq, inArray } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import {
  customDates as customDatesTable,
  festivals as festivalsTable,
  globalConfig,
  templates as templatesTable,
  users as usersTable,
} from '@/database/schema'
import { getDb } from '@/lib/db'
import { aggregateUserData } from '@/services/push/aggregate'
import { renderTemplate } from '@/services/template/render'

const bodySchema = z
  .object({ userIds: z.array(z.string().min(1)).optional() })
  .strict()

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const db = await getDb()

  const [configRow] = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)
  if (!configRow) {
    return NextResponse.json(
      { error: '全局配置未初始化，请先打开 /settings' },
      { status: 400 },
    )
  }

  const { userIds } = parsed.data
  const targets = userIds?.length
    ? await db
        .select()
        .from(usersTable)
        .where(
          and(
            inArray(usersTable.id, userIds),
            eq(usersTable.isDeleted, 0),
            eq(usersTable.enabled, true),
          ),
        )
    : await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.isDeleted, 0), eq(usersTable.enabled, true)))

  const ctx = {
    apiTimeout: configRow.apiTimeout,
    maxRetries: configRow.maxRetries,
    retryDelay: configRow.retryDelay,
  }

  const results = []

  for (const user of targets) {
    try {
      const [fests, dates] = await Promise.all([
        db
          .select()
          .from(festivalsTable)
          .where(
            and(
              eq(festivalsTable.userId, user.id),
              eq(festivalsTable.isDeleted, 0),
            ),
          ),
        db
          .select()
          .from(customDatesTable)
          .where(
            and(
              eq(customDatesTable.userId, user.id),
              eq(customDatesTable.isDeleted, 0),
            ),
          ),
      ])

      const templateRows = user.templateCode
        ? await db
            .select()
            .from(templatesTable)
            .where(
              and(
                eq(templatesTable.code, user.templateCode),
                eq(templatesTable.isDeleted, 0),
              ),
            )
            .limit(1)
        : []

      const templateRow = templateRows[0]
      if (!templateRow) {
        results.push({
          userId: user.id,
          userName: user.name || null,
          templateCode: user.templateCode,
          title: '',
          desc: '',
          sourceErrors: {} as Record<string, string>,
          error: `未找到模板 (templateCode=${user.templateCode || '未设置'})`,
        })
        continue
      }

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
        ctx,
      )

      const rendered = renderTemplate(templateRow, variables, {
        showColor: user.showColor,
      })

      results.push({
        userId: user.id,
        userName: user.name || null,
        templateCode: user.templateCode,
        title: rendered.title,
        desc: rendered.desc,
        sourceErrors,
      })
    } catch (err) {
      results.push({
        userId: user.id,
        userName: user.name || null,
        templateCode: user.templateCode,
        title: '',
        desc: '',
        sourceErrors: {} as Record<string, string>,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ results })
}

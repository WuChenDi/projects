import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { globalConfig } from '@/database/schema'
import { getDb } from '@/lib/db'
import { getHitokoto } from '@/services/sources/hitokoto'
import { getCiba } from '@/services/sources/iciba'
import type { SourceContext } from '@/services/sources/types'
import { getBaseWeather } from '@/services/sources/weather'

const SOURCES = ['weather', 'hitokoto', 'iciba'] as const
type SourceName = (typeof SOURCES)[number]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  if (!(SOURCES as readonly string[]).includes(name)) {
    return NextResponse.json(
      { error: 'Unknown source', supported: SOURCES },
      { status: 400 },
    )
  }

  const sp = request.nextUrl.searchParams
  const cityCode = sp.get('cityCode') ?? ''

  const db = await getDb()
  const [config] = await db
    .select()
    .from(globalConfig)
    .where(eq(globalConfig.id, 1))
    .limit(1)
  if (!config) {
    return NextResponse.json(
      { error: '全局配置未初始化，请先打开 /settings' },
      { status: 400 },
    )
  }

  const ctx: SourceContext = {
    apiTimeout: config.apiTimeout,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
  }

  const sourceName = name as SourceName
  const result = await callSource(sourceName, { ctx, cityCode })

  return NextResponse.json({ source: sourceName, ...result })
}

async function callSource(
  name: SourceName,
  args: { ctx: SourceContext; cityCode: string },
) {
  switch (name) {
    case 'weather':
      return getBaseWeather(args.cityCode, args.ctx)
    case 'hitokoto':
      return getHitokoto(args.ctx)
    case 'iciba':
      return getCiba(args.ctx)
  }
}

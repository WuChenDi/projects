import { fetchJson } from '@/lib/http'
import { withRetry } from '@/lib/withRetry'
import type { SourceContext, SourceResult } from './types'

export interface HitokotoData {
  content: string
  from: string
  from_who: string
}

interface HitokotoResponse {
  hitokoto?: string
  from?: string
  from_who?: string
}

export async function getHitokoto(
  ctx: SourceContext,
): Promise<SourceResult<HitokotoData>> {
  try {
    const data = await withRetry(
      () =>
        fetchJson<HitokotoResponse>('https://v1.hitokoto.cn/?encode=json', {
          timeout: ctx.apiTimeout,
        }),
      {
        context: '获取每日一言',
        maxRetries: ctx.maxRetries,
        retryDelay: ctx.retryDelay,
      },
    )
    if (!data.hitokoto) {
      return { ok: false, error: '一言接口返回为空' }
    }
    return {
      ok: true,
      data: {
        content: data.hitokoto,
        from: data.from ?? '未知',
        from_who: data.from_who ?? '未知',
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

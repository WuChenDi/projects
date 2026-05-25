import { fetchJson } from '@/lib/http'
import { withRetry } from '@/lib/withRetry'
import type { SourceContext, SourceResult } from './types'

export interface CibaData {
  content: string
  note: string
  picture: string
}

interface CibaResponse {
  content?: string
  note?: string
  picture?: string
}

export async function getCiba(
  ctx: SourceContext,
): Promise<SourceResult<CibaData>> {
  try {
    const data = await withRetry(
      () =>
        fetchJson<CibaResponse>('http://open.iciba.com/dsapi/', {
          timeout: ctx.apiTimeout,
        }),
      {
        context: '获取每日一句',
        maxRetries: ctx.maxRetries,
        retryDelay: ctx.retryDelay,
      },
    )
    if (!data.content) {
      return { ok: false, error: '每日一句接口返回为空' }
    }
    return {
      ok: true,
      data: {
        content: data.content,
        note: data.note ?? '',
        picture: data.picture ?? '',
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

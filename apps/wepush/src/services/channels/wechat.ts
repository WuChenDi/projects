import { fetchJson, HttpError } from '@/lib/http'
import { withRetry } from '@/lib/withRetry'

export interface WeChatChannelContext {
  appId: string
  appSecret: string
  apiTimeout: number
  maxRetries: number
  retryDelay: number
}

export class WeChatError extends Error {
  readonly code: string
  readonly payload: unknown

  constructor(message: string, code: string, payload: unknown) {
    super(message)
    this.name = 'WeChatError'
    this.code = code
    this.payload = payload
  }
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

interface SendResponse {
  errcode?: number
  errmsg?: string
  msgid?: number
}

export async function getAccessToken(
  ctx: WeChatChannelContext,
): Promise<string> {
  if (!ctx.appId || !ctx.appSecret) {
    throw new WeChatError(
      '微信 APP_ID / APP_SECRET 未配置',
      'MISSING_APP',
      null,
    )
  }
  const data = await withRetry(
    () =>
      fetchJson<TokenResponse>(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
          ctx.appId,
        )}&secret=${encodeURIComponent(ctx.appSecret)}`,
        { timeout: ctx.apiTimeout },
      ),
    {
      context: '获取微信 AccessToken',
      maxRetries: ctx.maxRetries,
      retryDelay: ctx.retryDelay,
    },
  )
  if (!data.access_token) {
    throw new WeChatError(
      data.errmsg || '获取 AccessToken 失败',
      'WECHAT_TOKEN_ERROR',
      data,
    )
  }
  return data.access_token
}

export interface SendTemplateInput {
  accessToken: string
  openId: string
  templateId: string
  data: Record<string, { value: string; color: string }>
  url?: string
  topColor?: string
}

export async function sendTemplateMessage(
  ctx: WeChatChannelContext,
  input: SendTemplateInput,
): Promise<{ msgid?: number }> {
  if (!input.openId) {
    throw new WeChatError('用户 OpenID 缺失', 'MISSING_OPENID', null)
  }
  if (!input.templateId) {
    throw new WeChatError('微信模板 ID 缺失', 'MISSING_TEMPLATE_ID', null)
  }

  const body = {
    touser: input.openId,
    template_id: input.templateId,
    url: input.url ?? '',
    topcolor: input.topColor ?? '#FF0000',
    data: input.data,
  }

  try {
    const result = await fetchJson<SendResponse>(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(
        input.accessToken,
      )}`,
      {
        timeout: ctx.apiTimeout,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      },
    )
    if (result.errcode !== 0) {
      throw new WeChatError(
        result.errmsg || '微信模板消息发送失败',
        'WECHAT_SEND_ERROR',
        result,
      )
    }
    return { msgid: result.msgid }
  } catch (error) {
    if (error instanceof WeChatError) throw error
    if (error instanceof HttpError) {
      throw new WeChatError(error.message, 'WECHAT_HTTP_ERROR', {
        url: error.url,
        status: error.status,
        body: error.body,
      })
    }
    throw error
  }
}

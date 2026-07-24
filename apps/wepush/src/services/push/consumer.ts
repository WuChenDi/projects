import type { Message, MessageBatch } from '@cloudflare/workers-types'
import { and, eq, sql } from 'drizzle-orm'
import type { Template, UserConfig } from '@/database/schema'
import { pushBatches, pushLogs } from '@/database/schema'
import type { DB } from '@/lib/db'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'
import { getAccessToken, WeChatError } from '@/services/channels/wechat'
import type { SourceContext } from '@/services/sources/types'
import type { SharedSources } from './aggregate'
import { buildSharedSources } from './aggregate'
import type { PushQueueMessage, SendResult } from './runner'
import {
  loadConfig,
  loadTargetUsers,
  preloadTemplates,
  preloadUserExtras,
  processUser,
} from './runner'

// WeChat transient rate-limit / busy codes: retry the message, write no log.
//   45009 = daily quota reached, 45011 = per-minute frequency limit,
//   -1     = system busy.
const RATE_LIMIT_ERRCODES = new Set([45009, 45011, -1])

/**
 * The numeric WeChat errcode when the error is a rate-limit / busy signal, else
 * null. The numeric code lives on `WeChatError.payload` (the raw API response);
 * `WeChatError.code` is only the string category, so we read the payload.
 */
function rateLimitErrcode(error: unknown): number | null {
  if (!(error instanceof WeChatError)) return null
  const errcode = (error.payload as { errcode?: number } | null | undefined)
    ?.errcode
  return typeof errcode === 'number' && RATE_LIMIT_ERRCODES.has(errcode)
    ? errcode
    : null
}

// Exponential backoff (base 30s) keyed on the delivery attempt, capped so a
// retried message stays well within the free-plan 24h retention window.
function retryDelaySeconds(attempts: number): number {
  return Math.min(30 * 2 ** attempts, 900)
}

function buildErrorPayload(error: unknown): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: error instanceof Error ? error.name : 'Unknown',
  }
  if (error instanceof WeChatError) {
    payload.code = error.code
    payload.payload = error.payload
  } else if (error instanceof Error && error.stack) {
    payload.stack = error.stack
  }
  return payload
}

/**
 * Queue consumer: drain a batch of per-recipient push jobs. Messages are grouped
 * by owner so each owner's config / access token / shared sources are resolved
 * once per invocation (preserves PERF-01/02), then every message is handled
 * idempotently and the batch counters are advanced atomically.
 */
export async function handlePushQueue(
  batch: MessageBatch<PushQueueMessage>,
  env: CloudflareEnv,
): Promise<void> {
  const db = await getDb(env)

  const byOwner = new Map<string, Message<PushQueueMessage>[]>()
  for (const msg of batch.messages) {
    const list = byOwner.get(msg.body.ownerId)
    if (list) list.push(msg)
    else byOwner.set(msg.body.ownerId, [msg])
  }

  for (const [ownerId, messages] of byOwner) {
    await handleOwnerBatch(db, ownerId, messages)
  }
}

async function handleOwnerBatch(
  db: DB,
  ownerId: string,
  messages: Message<PushQueueMessage>[],
): Promise<void> {
  let config: UserConfig
  try {
    config = await loadConfig(db, ownerId)
  } catch (error) {
    // Config gone: every message is a permanent failure. Terminalize each so the
    // batch can still finalize, then ack (no re-send).
    const message = error instanceof Error ? error.message : String(error)
    for (const msg of messages) {
      await terminalize(db, ownerId, msg, 'failed', { errorMessage: message })
      msg.ack()
    }
    return
  }

  const sourceCtx: SourceContext = {
    apiTimeout: config.apiTimeout,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
  }
  const shared = await buildSharedSources(sourceCtx)

  let accessToken: string | null = null
  let accessTokenError: string | undefined
  try {
    accessToken = await getAccessToken({
      appId: config.wechatAppId,
      appSecret: config.wechatAppSecret,
      apiTimeout: config.apiTimeout,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    })
  } catch (error) {
    // A rate-limited token fetch is transient — retry the whole owner batch (no
    // logs). Any other token failure is recorded so each message fails
    // permanently with a clear reason.
    if (rateLimitErrcode(error) !== null) {
      for (const msg of messages) {
        msg.retry({ delaySeconds: retryDelaySeconds(msg.attempts) })
      }
      return
    }
    accessTokenError = error instanceof Error ? error.message : String(error)
    console.error('获取微信 AccessToken 失败', {
      ownerId,
      error: accessTokenError,
    })
  }

  for (const msg of messages) {
    await handleMessage(db, config, shared, accessToken, accessTokenError, msg)
  }
}

async function handleMessage(
  db: DB,
  config: UserConfig,
  shared: SharedSources,
  accessToken: string | null,
  accessTokenError: string | undefined,
  msg: Message<PushQueueMessage>,
): Promise<void> {
  const { batchId, ownerId, userId } = msg.body
  try {
    // Idempotency: a log for (batchId, userId) means this recipient was already
    // processed — ack without resending. Backed by the FEAT-073 unique index.
    const [existing] = await db
      .select({ id: pushLogs.id })
      .from(pushLogs)
      .where(
        and(
          eq(pushLogs.ownerId, ownerId),
          eq(pushLogs.batchId, batchId),
          eq(pushLogs.userId, userId),
        ),
      )
      .limit(1)
    if (existing) {
      msg.ack()
      return
    }

    const [user] = await loadTargetUsers(db, ownerId, [userId])
    if (!user) {
      await terminalize(db, ownerId, msg, 'failed', {
        errorMessage: '推送对象不存在或已停用',
      })
      msg.ack()
      return
    }

    const extras = await preloadUserExtras(db, [userId])
    const templatesByCode = user.templateCode
      ? await preloadTemplates(db, ownerId, [user.templateCode])
      : new Map<string, Template>()

    let result: SendResult
    try {
      result = await processUser({
        user,
        config,
        accessToken,
        accessTokenError,
        shared,
        festivals: extras.festivals.get(userId) ?? [],
        customDates: extras.customDates.get(userId) ?? [],
        template: user.templateCode
          ? templatesByCode.get(user.templateCode)
          : undefined,
      })
    } catch (error) {
      // Rate-limited: retry the message with backoff, write no log.
      if (rateLimitErrcode(error) !== null) {
        msg.retry({ delaySeconds: retryDelaySeconds(msg.attempts) })
        return
      }
      // Permanent failure: record a failed log and ack.
      await terminalize(db, ownerId, msg, 'failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorPayload: buildErrorPayload(error),
      })
      msg.ack()
      return
    }

    await terminalize(db, ownerId, msg, 'success', {
      renderedTitle: result.renderedTitle,
      renderedDesc: result.renderedDesc,
      variableSnapshot: result.variableSnapshot,
      errorMessage: result.sourceWarning ?? null,
    })
    msg.ack()
  } catch (error) {
    // Unexpected (DB / infra) error. The idempotency check is the double-send
    // guard, but a throw after a successful send could not be distinguished from
    // one before it — so ack rather than retry to honour NEVER-double-send.
    console.error('推送队列消息处理异常', {
      batchId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    msg.ack()
  }
}

interface LogFields {
  renderedTitle?: string
  renderedDesc?: string
  variableSnapshot?: Record<string, unknown>
  errorMessage?: string | null
  errorPayload?: unknown
}

/**
 * Write the recipient's terminal push log, then atomically bump the batch's
 * success/failed counter and finalize the batch when the last message lands.
 */
async function terminalize(
  db: DB,
  ownerId: string,
  msg: Message<PushQueueMessage>,
  status: 'success' | 'failed',
  fields: LogFields,
): Promise<void> {
  const { batchId, userId, templateCode } = msg.body
  await db.insert(pushLogs).values({
    id: String(genid.nextId()),
    ownerId,
    batchId,
    userId,
    templateCode,
    status,
    renderedTitle: fields.renderedTitle ?? '',
    renderedDesc: fields.renderedDesc ?? '',
    variableSnapshot: fields.variableSnapshot ?? {},
    errorMessage: fields.errorMessage ?? null,
    errorPayload: fields.errorPayload,
    sentAt: new Date(),
  })
  await bumpAndFinalize(db, ownerId, batchId, status)
}

async function bumpAndFinalize(
  db: DB,
  ownerId: string,
  batchId: string,
  status: 'success' | 'failed',
): Promise<void> {
  await db
    .update(pushBatches)
    .set(
      status === 'success'
        ? { successCount: sql`${pushBatches.successCount} + 1` }
        : { failedCount: sql`${pushBatches.failedCount} + 1` },
    )
    .where(and(eq(pushBatches.id, batchId), eq(pushBatches.ownerId, ownerId)))

  const [row] = await db
    .select({
      successCount: pushBatches.successCount,
      failedCount: pushBatches.failedCount,
      totalCount: pushBatches.totalCount,
      status: pushBatches.status,
    })
    .from(pushBatches)
    .where(and(eq(pushBatches.id, batchId), eq(pushBatches.ownerId, ownerId)))
    .limit(1)
  if (!row || row.status !== 'running') return
  if (row.successCount + row.failedCount < row.totalCount) return

  const finalStatus =
    row.failedCount === 0
      ? 'success'
      : row.successCount === 0
        ? 'failed'
        : 'partial'
  // Guard on status='running' so only the last-in transition flips it; a racing
  // sibling invocation's WHERE won't match once it's terminal (idempotent).
  await db
    .update(pushBatches)
    .set({ status: finalStatus, finishedAt: new Date() })
    .where(
      and(
        eq(pushBatches.id, batchId),
        eq(pushBatches.ownerId, ownerId),
        eq(pushBatches.status, 'running'),
      ),
    )
}

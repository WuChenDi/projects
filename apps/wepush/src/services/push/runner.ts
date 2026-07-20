import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, eq, gte, inArray } from 'drizzle-orm'
import type { Template, User, UserConfig } from '@/database/schema'
import {
  customDates as customDatesTable,
  festivals as festivalsTable,
  pushBatches,
  pushLogs,
  templates as templatesTable,
  userConfig as userConfigTable,
  users as usersTable,
} from '@/database/schema'
import type { DB } from '@/lib/db'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'
import { sleep } from '@/lib/sleep'
import {
  getAccessToken,
  sendTemplateMessage,
  WeChatError,
} from '@/services/channels/wechat'
import { renderTemplate } from '@/services/template/render'
import { aggregateUserData } from './aggregate'

export type Trigger = 'manual' | 'api' | 'cron'

// A 'running' batch older than this is treated as a crashed run and no longer
// blocks a new push for the same owner (ARC-03 concurrency guard).
const STALE_RUN_MS = 15 * 60 * 1000

export interface RunPushInput {
  // Tenant whose recipients / config / token drive this run. Every row written
  // and read is scoped to it.
  ownerId: string
  trigger: Trigger
  userIds?: string[]
  // Provided by the worker `scheduled()` handler so `getDb()` can resolve
  // bindings without going through `getCloudflareContext()` (which is only
  // populated by opennext's fetch wrapper).
  env?: CloudflareEnv
  // Background executor registrar. The cron path passes `ctx.waitUntil` (the
  // `scheduled()` handler has no request context); request paths fall back to
  // `getCloudflareContext().ctx.waitUntil`.
  waitUntil?: (p: Promise<unknown>) => void
}

export interface StartPushResult {
  batchId: string
  status: 'running'
  // Set when the concurrency guard short-circuited: a run for this owner was
  // already in flight, so no new batch was created.
  alreadyRunning?: boolean
}

export interface PerUserResult {
  userId: string
  status: 'success' | 'failed'
  logId: string
  errorMessage?: string
}

async function loadConfig(db: DB, ownerId: string): Promise<UserConfig> {
  const rows = await db
    .select()
    .from(userConfigTable)
    .where(eq(userConfigTable.ownerId, ownerId))
    .limit(1)
  if (!rows[0]) {
    throw new Error('全局配置未初始化，请先打开 /settings')
  }
  return rows[0]
}

async function loadTargetUsers(
  db: DB,
  ownerId: string,
  ids: string[] | undefined,
): Promise<User[]> {
  if (ids && ids.length > 0) {
    return db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.ownerId, ownerId),
          inArray(usersTable.id, ids),
          eq(usersTable.isDeleted, 0),
          eq(usersTable.enabled, true),
        ),
      )
  }
  return db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.ownerId, ownerId),
        eq(usersTable.isDeleted, 0),
        eq(usersTable.enabled, true),
      ),
    )
}

async function loadUserExtras(db: DB, userId: string) {
  const [fests, dates] = await Promise.all([
    db
      .select()
      .from(festivalsTable)
      .where(
        and(eq(festivalsTable.userId, userId), eq(festivalsTable.isDeleted, 0)),
      ),
    db
      .select()
      .from(customDatesTable)
      .where(
        and(
          eq(customDatesTable.userId, userId),
          eq(customDatesTable.isDeleted, 0),
        ),
      ),
  ])
  return { festivals: fests, customDates: dates }
}

async function loadTemplate(
  db: DB,
  ownerId: string,
  code: string,
): Promise<Template | undefined> {
  if (!code) return undefined
  const rows = await db
    .select()
    .from(templatesTable)
    .where(
      and(
        eq(templatesTable.ownerId, ownerId),
        eq(templatesTable.code, code),
        eq(templatesTable.isDeleted, 0),
      ),
    )
    .limit(1)
  return rows[0]
}

/**
 * Client entry point: create the batch synchronously, then run the send loop in
 * the background via `waitUntil`. Returns as soon as the batch row exists — the
 * HTTP connection is never held open for the throttled send loop (ARC-01).
 */
export async function startPush(input: RunPushInput): Promise<StartPushResult> {
  const db = await getDb(input.env)
  const { ownerId } = input

  // ARC-03: refuse to start a second run while one is still in flight for this
  // owner (cron + manual, or a double-click). A row older than STALE_RUN_MS is
  // treated as crashed and does not block.
  const staleThreshold = new Date(Date.now() - STALE_RUN_MS)
  const [inFlight] = await db
    .select({ id: pushBatches.id })
    .from(pushBatches)
    .where(
      and(
        eq(pushBatches.ownerId, ownerId),
        eq(pushBatches.status, 'running'),
        eq(pushBatches.isDeleted, 0),
        gte(pushBatches.startedAt, staleThreshold),
      ),
    )
    .limit(1)
  if (inFlight) {
    return { batchId: inFlight.id, status: 'running', alreadyRunning: true }
  }

  const config = await loadConfig(db, ownerId)
  const targets = await loadTargetUsers(db, ownerId, input.userIds)

  const batchId = String(genid.nextId())
  const startedAt = new Date()
  // Insert BEFORE scheduling so the concurrency guard above sees this run.
  await db.insert(pushBatches).values({
    id: batchId,
    ownerId,
    trigger: input.trigger,
    status: 'running',
    totalCount: targets.length,
    successCount: 0,
    failedCount: 0,
    startedAt,
  })

  let waitUntil = input.waitUntil
  if (!waitUntil) {
    const { ctx } = getCloudflareContext()
    waitUntil = ctx.waitUntil.bind(ctx)
  }
  waitUntil(
    executePush({
      db,
      batchId,
      ownerId,
      trigger: input.trigger,
      config,
      targets,
    }),
  )

  return { batchId, status: 'running' }
}

interface ExecuteArgs {
  db: DB
  batchId: string
  ownerId: string
  trigger: Trigger
  config: UserConfig
  targets: User[]
}

/**
 * Background executor: the throttled per-user send loop. Always finalizes the
 * batch row to a terminal status via `finally`, so a mid-loop throw can't leave
 * status='running' forever (which would permanently trip the concurrency guard).
 */
async function executePush(args: ExecuteArgs): Promise<void> {
  const { db, batchId, config, targets, trigger } = args

  console.info('推送批次开始', {
    batchId,
    trigger,
    total: targets.length,
  })

  let successCount = 0
  let failedCount = 0
  try {
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
      accessTokenError = error instanceof Error ? error.message : String(error)
      console.error('获取微信 AccessToken 失败', { error: accessTokenError })
    }

    let pushedInWindow = 0
    for (let i = 0; i < targets.length; i++) {
      const user = targets[i]
      const result = await processUser({
        db,
        batchId,
        user,
        config,
        accessToken,
        accessTokenError,
      })
      if (result.status === 'success') successCount++
      else failedCount++

      pushedInWindow++
      if (pushedInWindow >= config.maxPushOneMinute && i < targets.length - 1) {
        console.warn('达到节流上限，休眠', {
          sleepMs: config.sleepTime,
        })
        await sleep(config.sleepTime)
        pushedInWindow = 0
      } else if (i < targets.length - 1) {
        await sleep(Math.min(2000, config.sleepTime))
      }
    }
  } finally {
    const finishedAt = new Date()
    // successCount === targets.length only when every target was processed AND
    // sent — so a crash mid-loop resolves to partial/failed, never success.
    const finalStatus: 'success' | 'partial' | 'failed' =
      successCount === targets.length
        ? 'success'
        : successCount === 0
          ? 'failed'
          : 'partial'

    await db
      .update(pushBatches)
      .set({
        status: finalStatus,
        successCount,
        failedCount,
        finishedAt,
      })
      .where(eq(pushBatches.id, batchId))

    console.info('推送批次完成', {
      batchId,
      successCount,
      failedCount,
    })
  }
}

interface ProcessArgs {
  db: DB
  batchId: string
  user: User
  config: UserConfig
  accessToken: string | null
  accessTokenError?: string
}

async function processUser(args: ProcessArgs): Promise<PerUserResult> {
  const { db, batchId, user, config, accessToken, accessTokenError } = args
  const logId = String(genid.nextId())
  const sentAt = new Date()

  try {
    const { festivals, customDates } = await loadUserExtras(db, user.id)
    const template = await loadTemplate(db, config.ownerId, user.templateCode)
    if (!template) {
      throw new Error(
        `未找到模板 (templateCode=${user.templateCode || '未设置'})`,
      )
    }

    const { data: variables, errors: sourceErrors } = await aggregateUserData(
      {
        id: user.id,
        name: user.name,
        city: user.city,
        weatherCityCode: user.weatherCityCode,
        showColor: user.showColor,
        festivals: festivals.map((f) => ({
          name: f.name,
          date: f.date,
          isLunar: f.isLunar,
        })),
        customDates: customDates.map((d) => ({
          keyword: d.keyword,
          date: d.date,
        })),
      },
      {
        apiTimeout: config.apiTimeout,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
      },
    )

    const rendered = renderTemplate(template, variables, {
      showColor: user.showColor,
    })

    if (!accessToken) {
      throw new Error(accessTokenError || '微信 AccessToken 不可用')
    }
    const templateId = user.wechatTemplateId || config.defaultWechatTemplateId
    await sendTemplateMessage(
      {
        appId: config.wechatAppId,
        appSecret: config.wechatAppSecret,
        apiTimeout: config.apiTimeout,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
      },
      {
        accessToken,
        openId: user.wechatOpenId,
        templateId,
        data: rendered.wechatData,
      },
    )

    await db.insert(pushLogs).values({
      id: logId,
      ownerId: config.ownerId,
      batchId,
      userId: user.id,
      templateCode: user.templateCode,
      status: 'success',
      renderedTitle: rendered.title,
      renderedDesc: rendered.desc,
      variableSnapshot: variables,
      errorMessage: Object.keys(sourceErrors).length
        ? `数据源警告: ${JSON.stringify(sourceErrors)}`
        : null,
      sentAt,
    })

    return { userId: user.id, status: 'success', logId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorPayload: Record<string, unknown> = {
      name: error instanceof Error ? error.name : 'Unknown',
    }
    if (error instanceof WeChatError) {
      errorPayload.code = error.code
      errorPayload.payload = error.payload
    } else if (error instanceof Error && error.stack) {
      errorPayload.stack = error.stack
    }

    console.error(`用户 ${user.name} 推送失败`, { error: errorMessage })

    await db.insert(pushLogs).values({
      id: logId,
      ownerId: config.ownerId,
      batchId,
      userId: user.id,
      templateCode: user.templateCode,
      status: 'failed',
      renderedTitle: '',
      renderedDesc: '',
      variableSnapshot: {},
      errorMessage,
      errorPayload,
      sentAt,
    })
    return { userId: user.id, status: 'failed', logId, errorMessage }
  }
}

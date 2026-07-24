import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, eq, gte, inArray } from 'drizzle-orm'
import type {
  CustomDate,
  Festival,
  Template,
  User,
  UserConfig,
} from '@/database/schema'
import {
  customDates as customDatesTable,
  festivals as festivalsTable,
  pushBatches,
  templates as templatesTable,
  userConfig as userConfigTable,
  users as usersTable,
} from '@/database/schema'
import type { DB } from '@/lib/db'
import { getDb } from '@/lib/db'
import { genid } from '@/lib/genid'
import { sendTemplateMessage } from '@/services/channels/wechat'
import type { TemplateData } from '@/services/template/render'
import { renderTemplate } from '@/services/template/render'
import type { SharedSources } from './aggregate'
import { aggregateUserData } from './aggregate'

export type Trigger = 'manual' | 'api' | 'cron'

// A 'running' batch older than this is treated as a crashed run and no longer
// blocks a new push for the same owner (ARC-03 concurrency guard).
const STALE_RUN_MS = 15 * 60 * 1000

// Free-plan Queues retain a delayed message for up to 24h. Realistic recipient
// lists keep the staggered delay far below this, but clamp defensively so an
// oversized list can never enqueue a message past its retention window.
const MAX_DELAY_SECONDS = 82_800

// Cloudflare `sendBatch` accepts at most 100 messages per call.
const QUEUE_CHUNK_SIZE = 100

// One queue job per recipient. Carries only owner-scoped identifiers; the
// consumer re-loads the recipient/template/config so nothing stale is trusted.
export interface PushQueueMessage {
  batchId: string
  ownerId: string
  userId: string
  templateCode: string
}

export interface RunPushInput {
  // Tenant whose recipients / config / token drive this run. Every row written
  // and read is scoped to it.
  ownerId: string
  trigger: Trigger
  userIds?: string[]
  // Provided by the worker `scheduled()` handler so `getDb()` / `PUSH_QUEUE` can
  // resolve bindings without going through `getCloudflareContext()` (which is
  // only populated by opennext's fetch wrapper).
  env?: CloudflareEnv
}

export interface StartPushResult {
  batchId: string
  status: 'running'
  // Set when the concurrency guard short-circuited: a run for this owner was
  // already in flight, so no new batch was created.
  alreadyRunning?: boolean
}

// Rendered payload returned by `processUser` on a successful send. The queue
// consumer turns this into the recipient's `success` push log.
export interface SendResult {
  renderedTitle: string
  renderedDesc: string
  variableSnapshot: TemplateData
  // Non-fatal data-source warnings to record on the success log; undefined when
  // every source resolved cleanly.
  sourceWarning?: string
}

export async function loadConfig(db: DB, ownerId: string): Promise<UserConfig> {
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

export async function loadTargetUsers(
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

/**
 * Bulk-load festivals + customDates for the given recipient ids in one query
 * each, grouped by userId (PERF-02). Both are already owner-scoped transitively
 * via the target userIds (which the caller filtered by ownerId). The queue
 * consumer calls this with a single id per message.
 */
export async function preloadUserExtras(
  db: DB,
  ids: string[],
): Promise<{
  festivals: Map<string, Festival[]>
  customDates: Map<string, CustomDate[]>
}> {
  const festivals = new Map<string, Festival[]>()
  const customDates = new Map<string, CustomDate[]>()
  if (ids.length === 0) return { festivals, customDates }

  const [fests, dates] = await Promise.all([
    db
      .select()
      .from(festivalsTable)
      .where(
        and(
          inArray(festivalsTable.userId, ids),
          eq(festivalsTable.isDeleted, 0),
        ),
      ),
    db
      .select()
      .from(customDatesTable)
      .where(
        and(
          inArray(customDatesTable.userId, ids),
          eq(customDatesTable.isDeleted, 0),
        ),
      ),
  ])

  for (const f of fests) {
    const list = festivals.get(f.userId)
    if (list) list.push(f)
    else festivals.set(f.userId, [f])
  }
  for (const d of dates) {
    const list = customDates.get(d.userId)
    if (list) list.push(d)
    else customDates.set(d.userId, [d])
  }
  return { festivals, customDates }
}

/**
 * Load the given template codes in one query, scoped to the owner (PERF-02).
 * Blank codes are skipped; a missing code simply won't appear in the map, so
 * `processUser` still fails that recipient. The queue consumer calls this with a
 * single code per message.
 */
export async function preloadTemplates(
  db: DB,
  ownerId: string,
  codes: string[],
): Promise<Map<string, Template>> {
  const byCode = new Map<string, Template>()
  if (codes.length === 0) return byCode
  const rows = await db
    .select()
    .from(templatesTable)
    .where(
      and(
        eq(templatesTable.ownerId, ownerId),
        inArray(templatesTable.code, codes),
        eq(templatesTable.isDeleted, 0),
      ),
    )
  for (const t of rows) byCode.set(t.code, t)
  return byCode
}

/**
 * Producer: create the batch synchronously, then fan out one queue message per
 * recipient. Returns as soon as the messages are enqueued — the throttled send
 * loop now lives in the queue consumer, so the HTTP connection is never held
 * open for it (ARC-01). The 202 contract `{ batchId, status: 'running' }` is
 * unchanged.
 */
export async function startPush(input: RunPushInput): Promise<StartPushResult> {
  const env = input.env ?? getCloudflareContext().env
  const db = await getDb(env)
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
  // Insert BEFORE enqueuing so the concurrency guard above sees this run.
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

  // No recipients: nothing to enqueue, so no consumer message would ever
  // finalize the batch. Close it out here (mirrors the old executor's 0-target
  // behaviour) so it doesn't sit 'running' and trip the concurrency guard.
  if (targets.length === 0) {
    await db
      .update(pushBatches)
      .set({ status: 'success', finishedAt: new Date() })
      .where(and(eq(pushBatches.id, batchId), eq(pushBatches.ownerId, ownerId)))
    return { batchId, status: 'running' }
  }

  // Stagger sends so the consumer honours the owner's WeChat rate limit: the
  // i-th recipient waits `floor(i / maxPushOneMinute)` whole minutes. Guard
  // against a 0/undefined knob to avoid divide-by-zero.
  const perMinute = config.maxPushOneMinute >= 1 ? config.maxPushOneMinute : 1
  const messages: MessageSendRequest<PushQueueMessage>[] = targets.map(
    (user, i) => ({
      body: {
        batchId,
        ownerId,
        userId: user.id,
        templateCode: user.templateCode,
      },
      delaySeconds: Math.min(Math.floor(i / perMinute) * 60, MAX_DELAY_SECONDS),
    }),
  )

  const queue = env.PUSH_QUEUE
  for (let i = 0; i < messages.length; i += QUEUE_CHUNK_SIZE) {
    await queue.sendBatch(messages.slice(i, i + QUEUE_CHUNK_SIZE))
  }

  console.info('推送批次已入队', {
    batchId,
    trigger: input.trigger,
    total: targets.length,
  })

  return { batchId, status: 'running' }
}

interface ProcessArgs {
  user: User
  config: UserConfig
  accessToken: string | null
  accessTokenError?: string
  // Batch-global sources shared across every recipient (PERF-01).
  shared: SharedSources
  // Per-user rows loaded for this recipient (PERF-02).
  festivals: Festival[]
  customDates: CustomDate[]
  template: Template | undefined
}

/**
 * Send one recipient's template message. Returns the rendered payload on success
 * and THROWS on any failure (missing template / no access token / WeChat error)
 * — the queue consumer decides retry-vs-failed-log from the thrown error, so log
 * writing and batch accounting stay out of the send core.
 */
export async function processUser(args: ProcessArgs): Promise<SendResult> {
  const {
    user,
    config,
    accessToken,
    accessTokenError,
    shared,
    festivals,
    customDates,
    template,
  } = args

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
    shared,
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

  return {
    renderedTitle: rendered.title,
    renderedDesc: rendered.desc,
    variableSnapshot: variables,
    sourceWarning: Object.keys(sourceErrors).length
      ? `数据源警告: ${JSON.stringify(sourceErrors)}`
      : undefined,
  }
}

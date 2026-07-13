import type { SQL } from 'drizzle-orm'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type {
  Launchpad,
  LaunchpadStatus,
  Link,
  NewLaunchpad,
} from '@/database/schema'
import { DEFAULT_LAUNCHPAD_CONFIG, launchpads, links } from '@/database/schema'
import type { SessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { newId } from '@/lib/genid'
import { isExpired, normalizeSlug } from '@/lib/links'
import { defaultSlug, validateSlug } from '@/lib/slug'
import type { RepoResult as RepoResultBase, SortKey } from '@/lib/types'
import type {
  CreateLaunchpadInput,
  EditLaunchpadInput,
} from '@/schemas/launchpad'

export type { SortKey }
export type RepoResult = RepoResultBase<{ launchpad: Launchpad }>

const SORT_COLUMNS = {
  createdAt: launchpads.createdAt,
  updatedAt: launchpads.updatedAt,
  expiresAt: launchpads.expiresAt,
} as const

// Single funnel for owner filtering. No-op today (shared workspace): returns
// the conditions unchanged. When per-owner isolation is enabled this becomes
// `[...conds, eq(launchpads.ownerId, session.id)]` — no schema backfill is
// needed since every row already carries `ownerId`.
export function scopeToOwner(conds: SQL[], _session: SessionUser): SQL[] {
  return conds
}

// Find a row by slug regardless of soft-delete state — the unique index covers
// deleted rows too, so create/update must see them.
async function findBySlug(
  env: CloudflareEnv,
  slug: string,
): Promise<Launchpad | null> {
  const db = await getDb(env)
  return (
    (
      await db
        .select()
        .from(launchpads)
        .where(eq(launchpads.slug, slug))
        .limit(1)
    )[0] ?? null
  )
}

// Resolve a launchpad for the public `/m/<slug>` route: it must be published,
// not soft-deleted, and not expired. Returns null otherwise (the route serves
// not-found). No auth context — the slug is globally unique.
export async function getPublishedLaunchpadBySlug(
  env: CloudflareEnv,
  rawSlug: string,
): Promise<Launchpad | null> {
  const db = await getDb(env)
  const row =
    (
      await db
        .select()
        .from(launchpads)
        .where(
          and(
            eq(launchpads.slug, normalizeSlug(rawSlug, env)),
            eq(launchpads.status, 'published'),
            eq(launchpads.isDeleted, 0),
          ),
        )
        .limit(1)
    )[0] ?? null
  if (!row || isExpired(row.expiresAt)) return null
  return row
}

// Batch-resolve link references (button/shortlink blocks store link IDs, never
// copied URLs) to their rows, keyed by id. Skips soft-deleted links so a public
// page never renders a button pointing at a removed short link.
export async function getLinksByIds(
  env: CloudflareEnv,
  ids: string[],
): Promise<Map<string, Link>> {
  if (ids.length === 0) return new Map()
  const db = await getDb(env)
  // Chunk at 99 ids so `inArray(ids)` + the `isDeleted` predicate never exceeds
  // the D1 100 bound-parameter cap.
  const rows: Link[] = []
  for (let i = 0; i < ids.length; i += 99) {
    const chunk = ids.slice(i, i + 99)
    rows.push(
      ...(await db
        .select()
        .from(links)
        .where(and(inArray(links.id, chunk), eq(links.isDeleted, 0)))),
    )
  }
  return new Map(rows.map((row) => [row.id, row]))
}

export async function getLaunchpadById(
  env: CloudflareEnv,
  id: string,
): Promise<Launchpad | null> {
  const db = await getDb(env)
  return (
    (
      await db
        .select()
        .from(launchpads)
        .where(and(eq(launchpads.id, id), eq(launchpads.isDeleted, 0)))
        .limit(1)
    )[0] ?? null
  )
}

export interface ListOptions {
  limit: number
  offset: number
  sort?: SortKey
  status?: LaunchpadStatus
}

export async function listLaunchpads(
  env: CloudflareEnv,
  opts: ListOptions,
  session: SessionUser,
): Promise<{ launchpads: Launchpad[]; total: number }> {
  const db = await getDb(env)
  const sortCol = SORT_COLUMNS[opts.sort ?? 'createdAt']
  const conds: SQL[] = [eq(launchpads.isDeleted, 0)]
  if (opts.status) conds.push(eq(launchpads.status, opts.status))
  const where = and(...scopeToOwner(conds, session))
  const rows = await db
    .select()
    .from(launchpads)
    .where(where)
    .orderBy(desc(sortCol))
    .limit(opts.limit)
    .offset(opts.offset)
  const totalRow = await db
    .select({ value: sql<number>`count(*)` })
    .from(launchpads)
    .where(where)
  return { launchpads: rows, total: Number(totalRow[0]?.value ?? 0) }
}

// Allocate a slug: validate a user-supplied one (must be unique among active
// rows; a soft-deleted row holding it is revived in place), or mint a random
// one. Returns the resolved slug + any existing row to revive, or an error.
async function resolveSlug(
  env: CloudflareEnv,
  rawSlug: string | undefined,
): Promise<
  | { ok: true; slug: string; existing: Launchpad | null }
  | { ok: false; status: number; error: string }
> {
  const trimmed = rawSlug?.trim()
  if (!trimmed) {
    return {
      ok: true,
      slug: normalizeSlug(defaultSlug(env), env),
      existing: null,
    }
  }
  const slugError = validateSlug(trimmed)
  if (slugError) return { ok: false, status: 400, error: `slug:${slugError}` }
  const slug = normalizeSlug(trimmed, env)
  const existing = await findBySlug(env, slug)
  if (existing && existing.isDeleted === 0) {
    return { ok: false, status: 409, error: 'Slug already exists' }
  }
  return { ok: true, slug, existing }
}

export async function createLaunchpad(
  env: CloudflareEnv,
  input: CreateLaunchpadInput,
  ownerId: string,
): Promise<RepoResult> {
  const slugResult = await resolveSlug(env, input.slug)
  if (!slugResult.ok) return slugResult
  const { slug, existing } = slugResult

  const values: NewLaunchpad = {
    id: existing?.id ?? newId(),
    slug,
    ownerId,
    title: input.title ?? '',
    status: input.status ?? 'draft',
    config: input.config ?? DEFAULT_LAUNCHPAD_CONFIG,
    og: input.og ?? {},
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isDeleted: 0,
    updatedAt: new Date(),
  }

  const db = await getDb(env)
  const row = existing
    ? // Revive a soft-deleted row holding this slug.
      (
        await db
          .update(launchpads)
          .set(values)
          .where(eq(launchpads.id, existing.id))
          .returning()
      )[0]!
    : (await db.insert(launchpads).values(values).returning())[0]!
  return { ok: true, launchpad: row }
}

export async function updateLaunchpad(
  env: CloudflareEnv,
  input: EditLaunchpadInput,
): Promise<RepoResult> {
  const current = await getLaunchpadById(env, input.id)
  if (!current) return { ok: false, status: 404, error: 'Launchpad not found' }

  const rawSlug = input.slug?.trim() || current.slug
  const slugError = validateSlug(rawSlug)
  if (slugError) return { ok: false, status: 400, error: `slug:${slugError}` }
  const slug = normalizeSlug(rawSlug, env)

  if (slug !== current.slug) {
    const clash = await findBySlug(env, slug)
    if (clash && clash.id !== current.id && clash.isDeleted === 0) {
      return { ok: false, status: 409, error: 'Slug already exists' }
    }
  }

  const db = await getDb(env)
  const row = (
    await db
      .update(launchpads)
      .set({
        slug,
        title: input.title ?? current.title,
        status: input.status ?? current.status,
        config: input.config ?? current.config,
        og: input.og ?? current.og,
        expiresAt:
          input.expiresAt === undefined
            ? current.expiresAt
            : input.expiresAt
              ? new Date(input.expiresAt)
              : null,
        updatedAt: new Date(),
      })
      .where(eq(launchpads.id, current.id))
      .returning()
  )[0]!
  return { ok: true, launchpad: row }
}

export async function upsertLaunchpad(
  env: CloudflareEnv,
  input: CreateLaunchpadInput,
  ownerId: string,
): Promise<RepoResult> {
  const rawSlug = input.slug?.trim()
  if (rawSlug) {
    const existing = await findBySlug(env, normalizeSlug(rawSlug, env))
    if (existing && existing.isDeleted === 0) {
      return updateLaunchpad(env, { ...input, id: existing.id })
    }
  }
  return createLaunchpad(env, input, ownerId)
}

export async function deleteLaunchpad(
  env: CloudflareEnv,
  id: string,
): Promise<RepoResult> {
  const current = await getLaunchpadById(env, id)
  if (!current) return { ok: false, status: 404, error: 'Launchpad not found' }
  const db = await getDb(env)
  await db
    .update(launchpads)
    .set({ isDeleted: 1, updatedAt: new Date() })
    .where(eq(launchpads.id, id))
  return { ok: true, launchpad: current }
}

export async function publishLaunchpad(
  env: CloudflareEnv,
  id: string,
  status: LaunchpadStatus,
): Promise<RepoResult> {
  const current = await getLaunchpadById(env, id)
  if (!current) return { ok: false, status: 404, error: 'Launchpad not found' }
  const db = await getDb(env)
  const row = (
    await db
      .update(launchpads)
      .set({ status, updatedAt: new Date() })
      .where(eq(launchpads.id, id))
      .returning()
  )[0]!
  return { ok: true, launchpad: row }
}

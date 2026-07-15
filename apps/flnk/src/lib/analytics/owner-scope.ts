import { and, eq } from 'drizzle-orm'
import { launchpads, links } from '@/database/schema'
import { getDb } from '@/lib/data/db'

// Analytics Engine rows carry no owner column — they are keyed by `slug`. To
// scope a caller's dashboard queries to their own data we resolve the set of
// slugs they own: link slugs via `links.createdBy = email`, launchpad slugs via
// `launchpads.ownerId = user.id`. The combined DISTINCT list becomes the AE
// `slug IN (...)` allow-list. An empty list means the caller owns nothing, so
// the query must return zero rows (fail-closed) rather than global data.
export async function getOwnerSlugs(
  env: CloudflareEnv,
  session: { id: string; email: string },
): Promise<string[]> {
  const db = await getDb(env)

  const [linkRows, launchpadRows] = await Promise.all([
    db
      .select({ slug: links.slug })
      .from(links)
      .where(and(eq(links.createdBy, session.email), eq(links.isDeleted, 0))),
    db
      .select({ slug: launchpads.slug })
      .from(launchpads)
      .where(
        and(eq(launchpads.ownerId, session.id), eq(launchpads.isDeleted, 0)),
      ),
  ])

  const slugs = new Set<string>()
  for (const r of linkRows) slugs.add(r.slug)
  for (const r of launchpadRows) slugs.add(r.slug)
  return [...slugs]
}

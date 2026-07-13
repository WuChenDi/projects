# flnk Security / Correctness / Architecture Audit — 2026-07-13

Scope: `apps/flnk` (Next.js App Router on Cloudflare via OpenNext; better-auth;
Drizzle over D1/libsql; KV cache; Analytics Engine; optional R2).

Method: read of the redirect hot path plus four parallel subsystem reviews
(auth/API, redirect/SSRF/XSS, DB/cache/quota, architecture). Findings below are
grouped SEC (security), QUA (correctness & Cloudflare quota/cost), ARC
(architecture). Each item lists severity, status, evidence (`file:line`), the
defect, and the fix direction.

## Design-intent decisions (locked by product owner, 2026-07-13)

flnk is currently a **demo**: authentication is intentionally open and the
workspace is shared. The `ownerId` / `createdBy` columns are reserved for a
future multi-tenant business change. Therefore:

- **SEC-01 (default-open auth)** and **SEC-02 (owner isolation / IDOR)** are
  **DEFERRED by design** — not fixed in this campaign. Recorded for traceability
  and to be revisited when the tenancy model changes.

Everything else (SEC-03…SEC-13, QUA-*, ARC-*) is **in scope**.

---

## SEC — Security

### SEC-01 — Default-open authentication `[HIGH]` — DEFERRED (by design)
`apps/flnk/src/lib/auth.ts:16-28`. `isEmailAllowed` returns `true` for every
email when `ALLOWED_EMAILS` is empty (current default), only logging a warning.
Combined with SEC-02 this means any Google/GitHub account gains full console
access. Deferred: demo is intentionally open. Future fix: fail-closed on empty
allow-list, or require an explicit `ALLOW_ALL_EMAILS=true` opt-in.

### SEC-02 — No owner isolation (IDOR) `[HIGH]` — DEFERRED (by design)
`apps/flnk/src/lib/launchpads.ts:35-37` (`scopeToOwner` is a no-op) and all link
/launchpad by-id CRUD filter only on `isDeleted`, never `ownerId`/`createdBy`.
Any authenticated user can read/edit/delete/publish another user's rows by id.
Deferred: shared workspace is intentional for the demo; `ownerId` is pre-wired.
Future fix: make `scopeToOwner` real and thread the session id into every by-id
`where`, returning 404 on mismatch.

### SEC-03 — Redirect path: no rate limit + cache penetration `[HIGH]` — IN SCOPE
`apps/flnk/src/app/[slug]/route.ts` (GET/POST) has no general per-IP limiter
(only the password-attempt limiter in `src/lib/rate-limit.ts`). `bench.mjs` `cold`
scenario demonstrates the attack: a fresh random valid-looking slug per request
→ `readCache` always misses → `resolveLink` (`src/lib/links.ts:279`) hits D1 every
time → `writeNegativeCache` (`links.ts:301`) writes a throwaway KV tombstone per
request. Result: **1 D1 read + 1 KV write per request**, negative cache useless
for unique slugs → exhausts D1 read and KV write quotas.
- Secondary: malformed slugs (fail `validateSlug`) still hit D1 (`links.ts:294-302`
  only skips the tombstone) — pure wasted reads.

Fix direction (two complementary layers):
1. In `resolveLink`, short-circuit `validateSlug(slug) !== null` → `return null`
   before the D1 query (a slug that fails validation can never exist, since all
   write paths validate). Kills the malformed-slug penetration class for free.
2. Add a per-IP resolve limiter using the Cloudflare native **Rate Limiting
   binding** (`ratelimits` in `wrangler.jsonc`; per-colo in-memory, no D1/KV
   quota cost). Check in `route.ts` GET/POST before `resolveLink`; 429 on
   exceed; fail-open when the binding is absent (dev) or IP is `unknown`.
   Configurable threshold via `env.ts` (default ~100 req / 60s).
- Acceptance: bench `cold` at high concurrency stops hitting D1/KV past the
  threshold; malformed slug never issues a D1 query.

### SEC-04 — Expensive endpoints unthrottled `[MEDIUM]` — IN SCOPE
`GET /api/link/ai`, `GET /api/link/og-ai`, `POST /api/backup`, `POST /api/link/check`.
`src/lib/ai-og.ts:58-108` has NO cache; `src/lib/ai-slug.ts` caches per-URL but is
bypassed by varying the URL; backup dumps the whole DB per call; check allows
100 ids × up to 30s. Cost/DoS abuse.
Fix: per-user/IP KV fixed-window limiter (reuse `rate-limit.ts` pattern) on the
AI / backup / check / import / export handlers; add a KV cache to `generateAiOg`.

### SEC-05 — Unauthenticated analytics injection + visitor-controlled log write `[MEDIUM]` — IN SCOPE
(a) `src/app/api/launchpad/track/route.ts:8-27` — public beacon accepts arbitrary
`slug`/`blockId` (shape-validated only), no auth, no rate limit, no existence
check → forge unlimited launchpad events + unbounded AE writes.
(b) `src/app/[slug]/route.ts:88` passes the **query-merged** `dest` to
`extractAccessLog`; when `redirectWithQuery` is on, visitor-controlled query
lands in the owner's analytics `blob2` (`src/lib/analytics.ts`) — log injection,
storage inflation, possible >5KB AE blob → silent write failure.
Fix: rate-limit track by IP + reject slugs that don't resolve to a published
launchpad; log `link.url` (stored destination), not the query-merged `dest`,
keeping `dest` only for the `Location` header.

### SEC-06 — Reversible IP "anonymization" `[MEDIUM]` — IN SCOPE
`src/lib/analytics.ts:116-130`. `anonymizeIp = SHA-256(`${ip}:${YYYY-MM-DD}`)[:32]`
— the only salt is the public current date; IPv4 space (~4.3B) is trivially
brute-forced, so the raw IP is recoverable. The "cannot be recovered" comment is
false; combined with stored city/region/UA this is re-identifiable PII.
Fix: keyed HMAC-SHA-256 over `${ip}:${day}` with a **secret** pepper
(`env` secret, e.g. `ANALYTICS_IP_SALT`); keep daily rotation, key stays secret.

### SEC-07 — Import bypasses http(s) URL enforcement `[MEDIUM]` — IN SCOPE
`src/schemas/link.ts` — `ImportConfigSchema` types `geo` as
`record(string,string)` and `apple`/`google` as bare `string` (no URL/scheme/
length check), and accepts `passwordHash` verbatim, unlike `LinkConfigInputSchema`
(`z.url()`). Imported values later become redirect `Location`
(`src/lib/redirect.ts:87-95`).
Fix: reuse the `httpUrl` / `z.url().max(2048)` validators for `geo` values,
`apple`, `google` (and bound `image`) in `ImportConfigSchema`.

### SEC-08 — Redirect `Location` scheme not validated at the redirect `[LOW/MED]` — IN SCOPE
`src/app/[slug]/route.ts:95` sets `location: dest` directly; only the HTML preview
paths sanitize via `safeExternalUrl` (`src/lib/html.ts:187`). geo/apple/google
override fields are the risk if they bypass create-time validation.
Fix: guard before the redirect — reject `dest` whose `new URL(dest).protocol` is
not `http:`/`https:` → `notFound`.

### SEC-09 — Dashboard layout doesn't re-check allow-list `[LOW]` — IN SCOPE
`src/app/dashboard/(app)/layout.tsx:12-16` checks only `getSession`, not
`isEmailAllowed` (unlike `requireSession`). Moot while the demo is open, but
cheap defense-in-depth. Fix: after `getSession`, also `isEmailAllowed` else
`redirect('/dashboard/login')` (export a shared helper from `auth.ts`).

### SEC-10 — Gate token replayable + reuses auth secret `[LOW]` — IN SCOPE
`src/lib/gate-token.ts:24-53`. HMAC covers only `slug:expiresAtMs` (no nonce/
user/IP binding → replayable for the 5-min TTL) and is keyed by
`BETTER_AUTH_SECRET` (no key separation). Constant-time compare is correct.
Fix: bind to a per-attempt nonce or client IP; derive a dedicated key (HKDF/
labelled) rather than using `BETTER_AUTH_SECRET` directly.

### SEC-11 — SSRF host blocklist gaps (dev/preview) `[LOW]` — IN SCOPE
`src/lib/health-check.ts:32-62`. `isBlockedHostname` misses CGNAT `100.64.0.0/10`,
IPv4-mapped IPv6 (`::ffff:169.254.169.254`), and non-dotted-decimal encodings
(octal `0177.0.0.1`, integer `2130706433`). Prod covered by
`global_fetch_strictly_public`; local dev/preview is not.
Fix: normalize the host / parse resolved IP form before the literal checks; add
`100.64/10` and IPv4-mapped-IPv6 ranges.

### SEC-12 — Launchpad `avatar` / `og.image` not scheme-validated `[LOW]` — IN SCOPE
`src/schemas/launchpad.ts:78-96`. Block `href`/`src` use `httpUrl` (stated
anti-stored-XSS policy) but `profile.avatar` and `og.image` are only
`z.string().max(2048)`. React escaping makes `javascript:` inert, but the
asymmetry defeats the stated policy. Fix: same http(s) refinement (allow the
`/api/asset/…` relative prefix if needed).

### SEC-13 — Prompt injection into AI slug/OG `[LOW]` — IN SCOPE
`src/lib/ai-og.ts:84`, `src/lib/ai-slug.ts:107` pass the raw URL as a chat `user`
message. Slug output is regex-normalized and OG output HTML-escaped (no XSS), but
attacker-chosen `title`/`description` can be stored and shown on social previews
(phishing/brand-spoof), unbounded beyond `max_tokens`.
Fix: wrap the URL in an explicit untrusted-data delimiter; hard-truncate
`title`/`description` (~60/160 chars) in `parseOg`.

**Explicitly checked, NOT vulnerable (no action):** HTML-generation XSS
(`html.ts` escapes all values + `safeExternalUrl`); AE SQL injection
(`analytics-query.ts` `sanitize` + numeric clamp + whitelisted dimensions); DoH
SSRF (fixed resolver); CSV formula injection (guarded); CSRF (better-auth
SameSite=Lax cookie).

---

## QUA — Correctness & Cloudflare quota/cost

### QUA-01 — Missing indexes on `links.expiresAt` / `createdAt` `[HIGH]` — IN SCOPE
`src/database/schema.ts:91-93` — only `uniq_links_slug_domain` exists. The daily
cron `WHERE is_deleted=0 AND expires_at<now` (`src/lib/cleanup.ts:36`), the
dashboard expired/active filters (`links.ts:402-405`), and `ORDER BY created_at`
(`links.ts:435`) are full-table scans; D1 bills `rows_read` → cost grows linearly
with total rows every day.
Fix: add `idx_links_expires_at` (and `created_at`) + a new Drizzle migration
under `src/database`.

### QUA-02 — Cron: serial unbounded per-row KV deletes `[HIGH]` — IN SCOPE
`src/lib/cleanup.ts:46-57` loops `await KV.delete` one row at a time (one
subrequest each). >~1000 expiring in a window blows the Workers subrequest cap or
times out mid-purge → D1 soft-deleted but KV still serving stale positive copy.
Fix: cap per-run batch + bounded-concurrency deletes (chunks of ~10-20).

### QUA-03 — Daily backup reads whole table via `listLinks` (count + tag join waste) `[HIGH]` — IN SCOPE
`src/lib/backup.ts:11-30` pages `listLinks` at 1000; each page runs a full-table
`count(*)` (`links.ts:438-441`) and `attachTagNames` (extra query) — yet the
backup payload uses neither. ~50k rows ≈ 50 selects + 50 counts + 50 tag queries
daily, half pure waste; exceeds the free 50-subrequest cap.
Fix: give backup its own streamed `select(needed cols).where(isDeleted=0)
.orderBy(id).limit/offset` loop — no `count(*)`, no `attachTagNames`.

### QUA-04 — `listLaunchpads` counts via select-all + `.length` `[HIGH cost]` — IN SCOPE
`src/lib/launchpads.ts:139-143` selects every matching row's id just to count
(`total: totalRow.length`), inconsistent with the links repo's `count(*)`. Full
`rows_read` charge per list request.
Fix: `select({ value: sql\`count(*)\` })` and read `[0].value`.

### QUA-05 — Cron order + error escape `[MEDIUM]` — IN SCOPE
`src/worker/index.ts:39-41`. (a) `backupToR2` runs AFTER `cleanupExpiredLinks`,
and backup filters `is_deleted=0` → links expiring today are removed from the
live view before the day's backup snapshots → never backed up → silent restore
loss. (b) `cleanupExpiredLinks` swallows its errors but `backupToR2` does not, so
a D1/R2 error throws out of `scheduled()` and fails the whole cron.
Fix: run backup before cleanup (or include soon-to-expire rows); wrap each in its
own try/catch with logging.

### QUA-06 — `inArray(100) + isDeleted` = 101 bound params > D1 cap `[MEDIUM]` — IN SCOPE
`getLinkRowsByIds` (`links.ts:357-367`) and `getLinksByIds`
(`launchpads.ts:~92`) add `eq(isDeleted,0)` on top of a 100-element `inArray` →
101 params. `api/link/check/route.ts` accepts exactly `max(100)` ids and passes
them straight through → "too many SQL variables".
Fix: chunk id lists at 99 (leave room for the constant) or chunk-and-merge inside
the helper.

### QUA-07 — Cleanup: unbounded `UPDATE … RETURNING` (no LIMIT) `[MEDIUM]` — IN SCOPE
`src/lib/cleanup.ts:33-38` soft-deletes all expired rows at once and materializes
each via `.returning()` into Worker memory (feeds QUA-02's serial loop). No
batch/LIMIT.
Fix: select a bounded page of expiring ids first (`LIMIT 500`), update+purge just
those, let the daily cadence drain the rest.

### QUA-08 — Cleanup leaks `visits:{id}` KV keys `[LOW]` — IN SCOPE
`src/lib/cleanup.ts:46-48` purges `link:{domain}:{slug}` but never the
`visits:{id}` counter (written with no `expirationTtl`, so it never expires) for
click-limited links → permanent KV storage leak.
Fix: also `KV.delete(`visits:${link.id}`)` in the purge loop (`id` is already in
`.returning()`).

### QUA-09 — health-check batch can issue ~200 outbound subrequests `[LOW]` — IN SCOPE
`src/lib/health-check.ts:119-152` via `api/link/check/route.ts:33` — 100 URLs ×
(reachability + DoH) ≈ 200 subrequests + up to ~100s wall time per request;
exceeds the free 50-subrequest cap.
Fix: lower the route batch cap (or DoH fan-out) so worst-case stays under the
plan cap.

**No issues found:** `src/lib/r2.ts` (null-gated), `src/lib/csv.ts` (formula
guard + quoting), dual-driver `getDb` (no `.batch`/transaction usage), analytics
write path blob/index counts (within AE limits, failures caught).

---

## ARC — Architecture (recommendations)

### ARC-01 — No test harness `[HIGH impact / M]` — IN SCOPE
No vitest/jest, no `*.test.ts` — only `scripts/bench.mjs`. Highest-value untested
code is security-critical and pure: `analytics-query.ts` `sanitize`,
`health-check.ts` `isBlockedHostname`, `gate-token.ts` verify (constant-time),
`csv.ts` `escapeCsvCell`, `slug.ts` `validateSlug`, `redirect.ts`
`resolveDestination`, `env.ts` `num`/`bool`.
Fix: add vitest; start with the 4 security-critical pure functions.

### ARC-02 — `links.ts` is a 966-line god-module `[HIGH / M]` — IN SCOPE
Mixes KV cache, redirect-path resolution, dashboard CRUD, and the tag subsystem.
Fix: split into `lib/links/{cache,resolve,repo,tags}.ts` (watch resolve→cache→
config import cycle). Enables ARC-01 and ARC-03.

### ARC-03 — 35× route auth+parse+error boilerplate `[MEDIUM / M]` — IN SCOPE
No uniform server error envelope; `requireSession` gate + `safeParse` 400 block +
`request.json().catch` duplicated across ~35 routes; only 7/38 have try/catch;
`ApiError` exists client-side only.
Fix: a `withAuth(schema, handler)` wrapper doing session-gate + zod-parse +
typed-error→envelope + top-level catch/log; migrate routes incrementally.

### ARC-04 — Flat `src/lib` (26 files), no domain grouping `[MEDIUM / S-M]` — IN SCOPE
Fix: group into `lib/{redirect,analytics,data,ai,platform,format}/` (mechanical
moves + import fixes; combine with ARC-02).

### ARC-05 — `env.ts` unvalidated + untyped `loose` fields `[MEDIUM / S]` — IN SCOPE
`num`/`bool` silently coerce (a typo'd value falls back with no warning); CF
creds / DoH / emails read through a `loose` cast (untyped, not in `cf-typegen`);
`getConfig` re-parses env every call on the hot path; three-tier env fallback
duplicated with `db.ts`.
Fix: zod-validate the config once (log on fallback); type the `loose` fields;
consolidate the raw-env resolution helper.

### ARC-06 — Duplication + scattered cache keys `[LOW-MED / S]` — IN SCOPE
Two divergent bot lists (`analytics.ts` `isBot` vs `redirect.ts` `isSocialCrawler`);
`RepoResult` defined twice (links/launchpads); `SortKey` defined 3× (api/links/
launchpads); response-error parsing duplicated 3× in `api.ts`; KV key schemes
inline in 3 files (`link:`, `visits:`, `pwfail:`).
Fix: `lib/bots.ts`, generic `RepoResult<T>`, hoisted `SortKey`, `parseError`
helper, `lib/cache-keys.ts` registry.

### ARC-07 — Leftover `sink`/`shortener` legacy references `[COSMETIC / S]` — IN SCOPE
Comments in `slug.ts:5`, `links.ts:636`, `api/location/route.ts`, `page.tsx`; and
a functional leftover: `ai-slug.ts:26-27` few-shot still primes
`https://shortener.cdlab.workers.dev` → `"shortener"`, biasing generated slugs.
Fix: cleanup pass; replace the stale few-shot example.

**Positives (keep):** fail-open/fail-closed policy is consistent and deliberate;
KV positive/negative-cache design is sound; type safety is clean (2 justified
casts, no `as any`).

---

## Suggested phasing (L2 owns final DAG)

1. **Phase 1 — quota/security stop-bleed:** SEC-03, QUA-01, QUA-02, QUA-05,
   QUA-07 (+ SEC-04/SEC-05 rate limits). Directly answers the resource-quota
   concern that opened this audit.
2. **Phase 2 — remaining correctness/quota:** QUA-03, QUA-04, QUA-06, QUA-08,
   QUA-09; remaining security SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11,
   SEC-12, SEC-13.
3. **Phase 3 — architecture:** ARC-01 → ARC-02 → ARC-03, then ARC-04, ARC-05,
   ARC-06, ARC-07. Larger refactors (ARC-02/04) last to avoid churn against the
   surgical fixes above.

PMA: each finding group becomes a `docs/task/FEAT-0xx.md` (continue from
FEAT-034), updating `docs/task/index.md` and `docs/changelog.md`. Docs English
only.

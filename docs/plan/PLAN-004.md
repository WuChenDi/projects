# PLAN-004 Sink P4 — remaining Sink-parity gaps (globe, AI-OG, auto-safe, i18n)

- **status**: completed
- **createdAt**: 2026-06-16 09:50
- **approvedAt**: 2026-06-16 10:20
- **relatedTask**: FEAT-009, FEAT-010, FEAT-011

## Context

P1–P3 (PLAN-001..003 / FEAT-001..008) reached the Sink-parity batches that were
planned. A full re-scan of `apps/sink` against the reference `tmp/Sink` (Nuxt
original) was run this session to surface what is still missing. PLAN-001
already deferred the WebGL globe ("not built, placeholder" — changelog
2026-06-14 05:42); this plan collects that plus the other confirmed gaps into a
final parity batch.

**This session output is documentation only — no implementation.**

### Method

Compared the reference server API, schemas, redirect middleware, dashboard
components and i18n against the port. Each candidate gap was verified in the
port source before listing (e.g. Safe Browsing *is* present on the health-check
page, so only the create/edit auto-flag is listed as missing).

### Already at parity (verified present — NOT gaps)

Password / expiration / cloaking / geo / device redirect / `redirectWithQuery`,
UTM builder, ISO country picker, world map, heatmap, analytics dimensional
drill-down filters, export/import, access-log CSV (`/api/stats/export` ==
reference `stats/[action]`), R2 backup, OG image upload, AI slug, link health
check + **on-demand** Safe Browsing, OG/social-crawler preview, reserved slugs,
multi-domain `(slug, domain)`.

## Confirmed gaps (port vs reference)

| # | Gap | Reference source | Port state | Severity |
|---|-----|------------------|------------|----------|
| A | Realtime **3D WebGL globe** of live visits | `composables/globe/*`, `realtime/globe/Globe.vue`, `public/sphere.bin`, `public/countries.geojson`, `scripts/build-sphere.js` | realtime page = chart + text log feed only | P2 (flagship visual; was explicitly deferred) |
| B | **`GET /api/logs/locations`** — geo-point aggregation (colo + lat/lng + weighted count) | `server/api/logs/locations.get.ts` | no endpoint (only `/api/logs/events`) | P2 (prereq for A) |
| C | **AI OG metadata** — generate OG title/description from a URL | `server/api/link/og-ai.get.ts`, `server/utils/ai.ts` | AI slug only | P3 |
| D | **Auto Safe-Browsing on create/edit** — auto-set `unsafe` via DoH at write time | `server/utils/link-processing.ts` (`detectUnsafeLink`) + `safe-browsing.ts` | Safe Browsing runs only on-demand in the health page; create/edit never auto-flags | P3 |
| E | **i18n breadth + localized interstitials** — 10 locales; password/unsafe redirect pages localized | `i18n/locales/*` (10), `server/utils/redirect-i18n.ts` | en/zh only; interstitial HTML is English-only | P3 |
| F | Realtime **animated notification feed** | `spark-ui/AnimatedList.vue`, `Notification.vue` | static list | P4 (polish) |
| G | Analytics **custom date/time range picker** | `dashboard/DatePicker.vue`, `TimePicker.vue` | fixed presets (1d/7d/30d/90d) only | P4 (polish) |
| H | Marketing **landing sections** (Stats / Logos / Testimonials / Cta) + GitHub stars + version-check banner | `components/home/*`, `useGithubStats`, `useVersionCheck` | simplified hero + 3 feature cards | P4 (optional; largely cosmetic) |

## Proposal — three implementation slices (+ deferred polish)

### FEAT-009 — Realtime globe (A + B + F) `P2`
- `GET /api/logs/locations`: AE SQL selecting colo + `double1`/`double2`
  (lat/lng) + `SUM(_sample_interval)` weighted count, grouped, time-filtered.
  Reuse `lib/analytics-query.ts` (`executeAeSql`, `whereClause`).
- Port the WebGL globe to React: bring `sphere.bin` + `countries.geojson`
  assets and the globe shaders/geometry; render live points from the locations
  feed. Lazy-load (idle callback) and SSR-skip like the world map.
- (F) Animated incoming-visit notification list on the realtime page.
- **Open decision**: port the bespoke WebGL globe (large, three.js-free custom
  GL) vs. a lighter React globe lib (`react-globe.gl`/`cobe`). Recommend `cobe`
  (tiny, no asset pipeline) unless pixel-parity with the original is required.

### FEAT-010 — AI OG + auto Safe-Browsing (C + D) `P3`
- `GET /api/link/og-ai?url=&locale=`: Workers AI prompt → `{title,description}`
  with a deterministic fallback; site-token gated. Wire an "AI fill" action
  into the editor OG fields (mirrors the existing AI-slug button).
- Auto Safe-Browsing: factor the DoH check out of `health-check.ts` into a
  shared `isSafeUrl(env,url)`; call it in `lib/links.ts` create/edit when
  `unsafe` is not explicitly set, setting `config.unsafe = true` on a hit.
  No-op when `SAFE_BROWSING_DOH` is unset.

### FEAT-011 — localized redirect interstitials (E) `P3`
- **Decided (2026-06-16): i18n stays en/zh only — locale breadth is dropped.**
  No new locale files; the 8 extra reference locales are out of scope.
- Localize the redirect interstitials (`lib/html.ts` password/unsafe pages):
  resolve locale from `Accept-Language` / `NEXT_LOCALE` cookie (port
  `redirect-i18n`) and render en/zh strings instead of English-only HTML. This
  is the only substantive code change in this slice.

### Deferred (P4 polish — track only, do not schedule now)
- G (custom date/time range picker), H (landing sections + GitHub stars +
  version banner). Cosmetic / low ROI; revisit after FEAT-009..011.

## Risks

- **Globe** is the heaviest item (custom GL + binary assets). Decision on
  port-vs-replace gates the effort estimate; recommend the lighter lib.
- **`/api/logs/locations`** depends on lat/lng actually being written to AE
  (`double1`/`double2`) — verify `extractAccessLog`/`writeAccessLog` populate
  them before building the globe, else the feed is empty.
- **AI OG / auto-safe** add per-write latency and external calls — keep them
  best-effort (never block link creation on AI/DoH failure).
- **i18n breadth** is mostly translation effort; the interstitial localization
  is the only code change of substance.
- No schema migrations expected (all additive endpoints/UI).

## Scope

Medium. New: `/api/logs/locations`, `/api/link/og-ai`, React globe + assets,
shared `isSafeUrl`, additional locale files, localized interstitials. `apps/
shortener` untouched. Orchestration constraint: in-session on `feat/sink-app`.

## Annotations

### 2026-06-16 — Drafted from a full re-scan; awaiting approval

Gap scan complete and verified against port source. Tracked as BKD cards
(project `projects`, tags `sink`,`P4`). Pending user approval on: (1) globe
port-vs-replace, (2) i18n full-vs-subset, before any implementation. Documents
only this session.

### 2026-06-16 — Approved; decisions settled

PLAN-004 approved. Decisions: (1) **globe → light lib (`cobe`)**, not a port of
the bespoke WebGL globe; (2) **i18n stays en/zh only** — FEAT-011 narrowed to
localizing the redirect interstitials (no new locale files). Implementation not
started this turn (user controls pace); awaiting a go signal and slice order.

### 2026-06-16 — Completed (FEAT-009..011)

All three slices implemented in-session on `feat/sink-app`; tsc + biome clean.
- FEAT-009: `cobe` globe + animated event feed; **reused `/api/location`** (the
  planned `/api/logs/locations` was unnecessary — that feed already existed).
- FEAT-010: `og-ai` endpoint + editor "AI fill"; auto Safe-Browsing in
  `buildConfig` via extracted `lib/safe-browsing.ts`.
- FEAT-011: localized password/unsafe interstitials (en/zh) +
  `resolveRedirectLocale`.
Deferred polish (G custom date picker, H landing sections) intentionally not
built. `next build` not run (heavy OpenNext/CF build); acceptance via tsc +
biome per the FEAT bar. Cards in `review` pending human confirmation.

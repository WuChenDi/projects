# PLAN-003 Sink P3 — migrate, R2 (backup + image), editor polish

- **status**: completed
- **createdAt**: 2026-06-14 12:00
- **approvedAt**: 2026-06-14 12:00
- **relatedTask**: FEAT-006, FEAT-007, FEAT-008

## Context

P1 + P2 are on `feat/sink-app` / PR #38. P3 is the last Sink-parity batch from
PLAN-001: migrate (export/import + access-log CSV), R2 (backup + OG image
upload), and editor polish (UTM builder + full country picker). Feature ref:
`tmp/Sink` (`server/api/link/{export,import}`, `server/api/backup.post`,
`server/api/upload/image.post`, `server/utils/r2`, `shared/utils/{csv,export-file}`).

Reuse: `lib/links.ts` (listLinks, upsertLink), `lib/analytics-query.ts`
(executeAeSql for CSV), `lib/genid`, the editor `link-editor.tsx`, shell nav,
`statsApi`/`linkApi` clients.

## Decisions (defaults; proceeding per "继续 P3")

1. **R2 binding** `R2`, bucket `sink`. Added to wrangler + cloudflare-env. Local
   dev uses wrangler's local R2; **deploy requires `wrangler r2 bucket create
   sink`** (external, flagged). Backup + image upload depend on it.
2. **Export/import format**: our Link shape (`id, slug, domain, url, comment,
   config, expiresAt`) wrapped as `{version:'1.0', exportedAt, count, links}`.
   Import upserts by `(slug, domain)`; reports `{success, skipped, failed}`.
3. **Country picker**: bundle a small ISO-3166 list (code + name) + emoji flag
   from the code; use `@cdlab996/ui` combobox. No heavy dep.
4. **Image upload**: jpeg/png/webp/gif, max 5MB; R2 key `og/{slug}/{id}.{ext}`;
   served via `GET /api/asset/[...key]`; wired into the editor OG image field.

## Proposal — three slices

### P3a — Migrate (FEAT-006), no R2
- `GET /api/link/export` → JSON of all active links (capped).
- `POST /api/link/import` → upsert from JSON, report success/skipped/failed.
- `GET /api/stats/export` → access-log CSV (AE; reuse analytics-query + a CSV util).
- `/dashboard/migrate` page + nav: export (download JSON), import (file → POST),
  access-log CSV export.

### P3b — R2 backup + image upload (FEAT-007)
- R2 binding; `POST /api/backup` (manual) + cron scheduled backup in the worker.
- `POST /api/upload/image` (multipart → R2) + `GET /api/asset/[...key]` serving.
- Editor OG image: uploader (replaces/augments the plain URL field).

### P3c — Editor polish (FEAT-008), no binding
- UTM builder (append utm_* to the destination URL) in the editor.
- Full ISO country picker (combobox + flags) for geo routes (replaces the plain
  2-letter input).

## Risks

- **R2 provisioning** is external (deploy needs the bucket); backup/upload
  untestable on deploy until provisioned. Local wrangler R2 covers dev.
- Image upload is an untrusted-file sink — validate type + size, randomize key,
  never serve with an attacker-controlled content-type; site-token gate uploads.
- Access-log CSV / export can be large — cap rows / link count.
- Migrations: none (P3 adds no schema columns; OG image is already in `config`).

## Scope

Medium-large. New API routes (export/import, stats/export, backup, upload/image,
asset), `/dashboard/migrate` page, editor UTM + country picker, R2 binding +
wrangler/worker wiring, country-data asset, i18n. `apps/shortener` untouched.

## Annotations

### 2026-06-14 — Planned; proceeding on defaults

Tracked as BKD cards (tags `sink`,`P3`). In-session on `feat/sink-app` (same
orchestration constraint). Implementing P3a first, then P3c, then P3b; R2
bucket provisioning flagged to the user for deploy.

# projects-monorepo - Task List

> Updated: 2026-07-11

## Usage

Each task is a single line linking to its detail file. All detailed information lives in `docs/task/PREFIX-NNN.md`.

### Format

- [ ] [**PREFIX-001 Short imperative title**](PREFIX-001.md) `P1`

### Status Markers

| Marker | Meaning |
|--------|---------|
| `[ ]`  | Pending |
| `[-]`  | In progress |
| `[x]`  | Completed |
| `[~]`  | Closed / Won't do |

### Priority: P0 (blocking) > P1 (high) > P2 (medium) > P3 (low)

### Rules

- Only update the checkbox marker; never delete the line.
- New tasks append to the end.
- See each `PREFIX-NNN.md` for full details.

---

## Tasks

- [x] [**FEAT-001 Rebuild shortener as a Sink-like Next.js app**](FEAT-001.md) `P1`
- [x] [**FEAT-002 Sink P2a — stats/logs backend (heatmap, location, logs)**](FEAT-002.md) `P2`
- [x] [**FEAT-003 Sink P2b — world map + heatmap on analytics page**](FEAT-003.md) `P2`
- [x] [**FEAT-004 Sink P2c — realtime page**](FEAT-004.md) `P2`
- [x] [**FEAT-005 Sink P2d — link health check page**](FEAT-005.md) `P2`
- [x] [**FEAT-006 Sink P3a — migrate (export / import / access-log CSV)**](FEAT-006.md) `P3`
- [x] [**FEAT-007 Sink P3b — R2 backup + OG image upload**](FEAT-007.md) `P3`
- [x] [**FEAT-008 Sink P3c — editor polish (UTM builder + country picker)**](FEAT-008.md) `P3`
- [x] [**FEAT-009 Sink P4a — realtime WebGL globe + locations feed**](FEAT-009.md) `P2`
- [x] [**FEAT-010 Sink P4b — AI OG metadata + auto Safe-Browsing on write**](FEAT-010.md) `P3`
- [x] [**FEAT-011 Sink P4c — localized redirect interstitials (en/zh)**](FEAT-011.md) `P3`
- [x] [**FEAT-012 Sink — replace SITE_TOKEN with better-auth (Google/GitHub social login)**](FEAT-012.md) `P1`
- [ ] [**FEAT-013 Sink P5a — overview real metrics**](FEAT-013.md) `P2`
- [x] [**FEAT-014 Sink P5b — per-link clicks + analytics drill-down**](FEAT-014.md) `P2`
- [x] [**FEAT-015 Sink P5c — link tags**](FEAT-015.md) `P2`
- [x] [**FEAT-016 Sink P5d — click-limit expiration (maxVisits)**](FEAT-016.md) `P3`
- [x] [**FEAT-017 Sink P5e — enable/disable (pause) toggle**](FEAT-017.md) `P3`
- [x] [**FEAT-018 Sink — upgrade AI slug quality (few-shot + robust parsing)**](FEAT-018.md) `P3`
- [x] [**FEAT-019 flnk — make tags functional (server-side filter, multi-tag, batch, overview)**](FEAT-019.md) `P1`
- [x] [**FEAT-020 flnk — tags as a dictionary table + inline tag-ID column**](FEAT-020.md) `P1`
- [x] [**FEAT-021 flnk — link display title (management name)**](FEAT-021.md) `P2`
- [x] [**FEAT-022 flnk — QR code styling + scan-source tracking**](FEAT-022.md) `P2`
- [x] [**FEAT-023 flnk — launchpads: data model + CRUD API**](FEAT-023.md) `P1`
- [x] [**FEAT-024 flnk — launchpads: public /m/<slug> render + analytics**](FEAT-024.md) `P1`
- [x] [**FEAT-025 flnk — launchpads: dashboard editor (Build/Design/Track)**](FEAT-025.md) `P1`
- [x] [**FEAT-026 bytts — single-page editor shell + timeline render + preview playback**](FEAT-026.md) `P1`
- [x] [**FEAT-027 bytts editor — editing interactions (drag/trim/split/undo) + autosave**](FEAT-027.md) `P1`
- [x] [**FEAT-028 bytts editor — P0 audio features (fades, gain, mute/solo, silence removal)**](FEAT-028.md) `P1`
- [x] [**FEAT-029 bytts editor — export mixdown (mp3/wav) + save to history**](FEAT-029.md) `P1`
- [x] [**FEAT-034 flnk — redirect rate-limit + cache-penetration guard (SEC-03)**](FEAT-034.md) `P1`
- [x] [**FEAT-035 flnk — links expiresAt/createdAt indexes + migration 0003 (QUA-01)**](FEAT-035.md) `P1`
- [x] [**FEAT-036 flnk — cleanup batching + LIMIT page + visits purge (QUA-02/07/08)**](FEAT-036.md) `P1`
- [x] [**FEAT-037 flnk — cron order (backup before cleanup) + per-task try/catch (QUA-05)**](FEAT-037.md) `P2`
- [x] [**FEAT-038 flnk — AI/backup throttle + OG KV cache + prompt hardening (SEC-04/13)**](FEAT-038.md) `P2`
- [x] [**FEAT-039 flnk — track-beacon guard + stored-dest logging + HMAC IP pepper (SEC-05/06)**](FEAT-039.md) `P2`
- [x] [**FEAT-040 flnk — check batch caps + id-chunk-99 + SSRF blocklist (QUA-06/09, SEC-11)**](FEAT-040.md) `P2`
- [x] [**FEAT-041 flnk — streamed backup query + launchpad count(*) (QUA-03/04)**](FEAT-041.md) `P1`
- [x] [**FEAT-042 flnk — import/redirect/launchpad URL+scheme validation (SEC-07/08/12)**](FEAT-042.md) `P2`
- [x] [**FEAT-043 flnk — dashboard allow-list parity + gate-token nonce/IP + key separation (SEC-09/10)**](FEAT-043.md) `P3`
- [x] [**FEAT-044 flnk — vitest harness + security unit tests (ARC-01)**](FEAT-044.md) `P2`
- [x] [**FEAT-045 flnk — withAuth route wrapper + server error envelope (ARC-03)**](FEAT-045.md) `P2`
- [x] [**FEAT-046 flnk — env zod validation + typed fields + memoized getConfig (ARC-05)**](FEAT-046.md) `P2`
- [x] [**FEAT-047 flnk — dedup bots/RepoResult/SortKey + cache-keys registry (ARC-06)**](FEAT-047.md) `P3`
- [x] [**FEAT-048 flnk — strip sink/shortener legacy references (ARC-07)**](FEAT-048.md) `P3`
- [x] [**FEAT-049 flnk — split links.ts into lib/data/links/{cache,resolve,repo,tags} (ARC-02)**](FEAT-049.md) `P2`
- [x] [**FEAT-050 flnk — group src/lib into domain folders (ARC-04)**](FEAT-050.md) `P2`

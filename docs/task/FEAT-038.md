# FEAT-038 flnk — AI/backup throttle + OG KV cache + prompt hardening (SEC-04/13)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (SEC-04, SEC-13)

## Background

- **SEC-04 `[MEDIUM]`** — `GET /api/link/ai`, `GET /api/link/og-ai`,
  `POST /api/backup`, `POST /api/link/check` were unthrottled; `generateAiOg` had
  no cache, the per-URL AI-slug cache was bypassed by varying the URL, and backup
  dumped the whole DB per call → cost/DoS abuse.
- **SEC-13 `[LOW]`** — `ai-og.ts` / `ai-slug.ts` passed the raw URL as a chat
  `user` message; attacker-chosen `title`/`description` could be stored and shown
  on social previews (phishing/brand-spoof), unbounded beyond `max_tokens`.

## What changed

- Per-user/IP KV fixed-window limiter (reusing the `rate-limit.ts` pattern) on the
  AI / backup / check / import / export handlers.
- KV cache added to `generateAiOg`.
- Prompt hardening: wrap the URL in an explicit untrusted-data delimiter and
  hard-truncate `title`/`description` (~60/160 chars) in `parseOg`.

## Acceptance

- Expensive endpoints return 429 past the window; repeated OG requests hit the KV
  cache; OG title/description bounded.
- `tsc` + `biome` green.

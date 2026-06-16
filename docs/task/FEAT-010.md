# FEAT-010 Sink P4b — AI OG metadata + auto Safe-Browsing on write

- **status**: completed
- **priority**: P3
- **owner**: feat/sink-app session
- **createdAt**: 2026-06-16 09:50

## Implementation

- `lib/safe-browsing.ts` — extracted `safeBrowsingHost(doh,host)` from
  `health-check.ts` (now imports it) + new `isUnsafeUrl(env,url)` (best-effort,
  no-op when `SAFE_BROWSING_DOH` unset, never throws).
- `lib/links.ts` `buildConfig(env, input, url, previous)` — auto-flags
  `config.unsafe = true` when not explicitly set and the DoH probe hits. Wired
  in `createLink` (url=input.url) + `updateLink` (url=input.url ?? current.url).
- `lib/ai-og.ts` `generateAiOg(env,url,locale)` — Workers AI → `{title,
  description}` with few-shot + hostname fallback; `env.AI`-gated.
  `AI_OG_PROMPT` config (default baked) in `lib/env.ts`.
- `GET /api/link/og-ai?url=&locale=` — site-token gated; `linkApi.aiOg`.
- Editor: "AI fill" button on the OG section fills title+description (uses the
  UI locale). i18n `links.form.aiOg` (en/zh). tsc + biome clean.

## Description

Two link-write enhancements present in the reference but missing in the port:
- `GET /api/link/og-ai?url=&locale=` — Workers AI → `{title,description}` with a
  deterministic fallback; site-token gated. Wire an "AI fill" action into the
  editor OG fields (mirrors the AI-slug button).
- Auto Safe-Browsing: extract the DoH check from `lib/health-check.ts` into a
  shared `isSafeUrl(env,url)`; call it in `lib/links.ts` create/edit when
  `unsafe` is not explicitly set, marking `config.unsafe = true` on a hit. No-op
  when `SAFE_BROWSING_DOH` is unset.

## Acceptance Criteria

Build + biome clean; og-ai returns metadata + falls back without AI; editor AI
fill populates OG fields; create/edit auto-flags a known-bad URL when DoH is
configured and is best-effort (never blocks the write on failure); 401 gate;
en/zh i18n.

## ActiveForm

Building AI OG metadata and auto Safe-Browsing detection.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-004 §FEAT-010. Reference: `server/api/link/og-ai.get.ts`,
`server/utils/{ai,safe-browsing,link-processing}.ts` (`detectUnsafeLink`).

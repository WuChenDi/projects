# FEAT-018 Sink — upgrade AI slug quality (few-shot + robust parsing)

- **status**: completed
- **priority**: P3
- **owner**: feat/sink-app session
- **createdAt**: 2026-06-26

## Description

Sink already ships AI slug generation (`lib/ai-slug.ts`, `GET /api/link/ai`,
editor/drawer Sparkles button). Compared to the shortener reference
(`apps/shortener/src/utils/slug.ts`), sink's version lacks two quality knobs
that make AI output more reliable:

- **Few-shot examples** — shortener primes the model with 8 URL→slug examples,
  producing more idiomatic slugs (repo name, `*-docs`, `tg-*`, etc.).
- **Multi-level parsing** — shortener parses strict JSON → embedded
  `{...slug...}` → bare slug substring before giving up. Sink does a single
  regex pass, so any non-JSON/explained reply falls straight to random fallback.

## Scope

Single file: `apps/sink/src/lib/ai-slug.ts`.

- Inject the 8 few-shot messages between the system prompt and the user URL.
- Replace single-level `parseSlug` with the 3-tier fallback.
- Keep existing function signature, KV cache, timeout, and random fallback.
- No API/route/UI/env changes. Do NOT port `/batch-slug` or `/suggestions`
  (no UI consumer in sink) or shortener's confidence/retry/enable config.

## Acceptance Criteria

`pnpm --filter @cdlab/sink typecheck` + biome clean. Sparkles button still
returns a usable slug; non-JSON model replies now recover a slug instead of
always randomising; AI-unavailable path still random-fallbacks as before.

## ActiveForm

Porting few-shot examples + robust slug parsing into sink's ai-slug.

## Dependencies

- **blocked by**: (none)
- **blocks**: removal of `apps/shortener` (feature-parity precondition)

## Notes

Reference: `apps/shortener/src/utils/slug.ts` (`SYSTEM_PROMPT`,
`FEW_SHOT_EXAMPLES`, `parseAIResponse`).

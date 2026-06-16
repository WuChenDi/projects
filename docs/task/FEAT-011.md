# FEAT-011 Sink P4c — localized redirect interstitials (en/zh)

- **status**: completed
- **priority**: P3
- **owner**: feat/sink-app session
- **createdAt**: 2026-06-16 09:50

## Implementation

- `lib/html.ts` — `unsafeWarningHtml(url, locale?)` and
  `passwordFormHtml(slug, error?, locale?)` now carry en/zh string tables
  (`pickLocale` folds `zh-*`→`zh`); `<html lang>` + title/body/buttons localized.
  `ogPageHtml` (crawler-only) left as-is.
- `lib/redirect.ts` — new `resolveRedirectLocale(request)`: `NEXT_LOCALE`
  cookie → `Accept-Language` → `defaultLocale`, constrained to `locales`
  (en/zh).
- `app/[slug]/route.ts` — GET password/unsafe branches + POST password-error
  branch pass the resolved locale. tsc + biome clean.

## Description

Localize the redirect interstitials (`lib/html.ts` password + unsafe pages):
resolve locale from `Accept-Language` / `NEXT_LOCALE` cookie (reference
`server/utils/redirect-i18n.ts`) and render en/zh strings instead of the current
English-only HTML, falling back to default.

**Scope decision (2026-06-16): i18n stays en/zh only.** Adding the other 8
reference locales (de, fr, id, it, pt-BR, pt-PT, vi, zh-TW) is dropped — no new
locale files. This slice is now interstitial localization only.

## Acceptance Criteria

Build + biome clean; interstitial pages render in the resolved locale (en/zh)
and fall back to default; no untranslated keys; no new locale files added.

## ActiveForm

Localizing the redirect interstitials (en/zh).

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-004 §FEAT-011. Reference: `server/utils/redirect-i18n.ts`.

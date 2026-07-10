# FEAT-008 Sink P3c — editor polish (UTM builder + country picker)

- **status**: completed
- **priority**: P3
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 12:00

## Description

Link editor polish (no binding):
- UTM builder: fields (source/medium/campaign/term/content) that append `utm_*`
  query params to the destination URL.
- Full ISO-3166 country picker (combobox + emoji flag) for geo routes, replacing
  the plain 2-letter input.

## Acceptance Criteria

Build + biome clean; UTM params append correctly; country picker sets the geo
country code; en/zh i18n.

## ActiveForm

Polishing the link editor (UTM + country picker).

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-003 §P3c. Country list bundled (code+name), flag derived from code; use
`@cdlab/ui` combobox (no heavy dep).

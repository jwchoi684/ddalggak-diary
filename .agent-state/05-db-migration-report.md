# Data Model / Migration Report

## Summary

REQ-006 is a Next.js App Router routing shell. It creates five `page.tsx` placeholders,
`not-found.tsx`, `src/lib/navigation/routes.ts` (pure path constants and builders), a
barrel `index.ts`, and a shared Vitest mock helper. No data is read, written, or modeled
by any of these files.

## Schema Change Required

None. This project has no database. The confirmed storage layer is `localStorage` with
fixed keys established by REQ-002 (`ddalkkak:diaries:v1`, `ddalkkak:conversations:v1`,
`ddalkkak:settings:v1`). REQ-006 files do not reference any of those keys.

## Migration Strategy

Not applicable.

## Backfill / Default / Nullability

Not applicable.

## Index Requirements

Not applicable.

## Existing Data Compatibility

The `/diary/[date]` dynamic segment accepts `date` as a URL path string. The regex guard
`^\d{4}-\d{2}-\d{2}$` is consistent with `DiaryEntry.date: string` (`YYYY-MM-DD`) defined
in REQ-002. No change to the stored type is implied; the URL segment is a read-only key
for routing, not a schema field.

## Rollback Considerations

Not applicable. All changes are additive TypeScript/TSX files with no persistence side
effects. Removing them reverts the routing surface only.

## Query Performance Risk

None. `routes.ts` is a pure constant module. No storage reads occur in any REQ-006 file.

## Seed / Fixture Impact

None.

## Files Expected to Change

- `src/app/not-found.tsx` (new)
- `src/app/diary/[date]/page.tsx` (new)
- `src/app/list/page.tsx` (new)
- `src/app/chat/page.tsx` (new)
- `src/app/stats/page.tsx` (new)
- `src/lib/navigation/routes.ts` (new)
- `src/lib/navigation/index.ts` (new)
- `src/lib/navigation/__tests__/setupNextNavigation.ts` (new)
- `src/lib/navigation/__tests__/routes.test.ts` (new)
- `src/app/__tests__/diary-date-page.test.tsx` (new)
- `src/app/__tests__/not-found.test.tsx` (new)

No existing file is modified for data reasons.

## Test Requirements

No migration tests are needed. `routes.test.ts` validates path-string correctness only.

## Verdict
PASS — not applicable; REQ-006 is a routing shell with no persistence.

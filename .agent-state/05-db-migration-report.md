# Data Model / Migration Report

## Summary

REQ-007 implements the main calendar screen. It consumes existing storage read-only
and introduces no persistence changes of any kind.

## Schema Change Required

No. The project uses `localStorage` (no relational DB, no ORM, no migration files).
The storage schema (`ddalkkak:diaries:v1`, `ddalkkak:conversations:v1`,
`ddalkkak:settings:v1`) was fixed in REQ-002 and is unchanged here.

## Migration Strategy

Not applicable. No migrations exist or are needed.

## Backfill / Default / Nullability

Not applicable. No new fields, no nullability changes, no default values introduced.

## Index Requirements

Not applicable. `CalendarGrid` uses a `Map<string, DiaryEntry>` built via `useMemo`
in-memory — a runtime lookup index, not a storage-level index.

## Existing Data Compatibility

Full compatibility. `readDiaries()` returns the existing `DiaryEntry[]` array
unchanged. REQ-007 only reads; it never calls `upsertDiary` or `deleteDiary`.

## Rollback Considerations

Not applicable. No storage writes occur. Reverting the UI code has zero data impact.

## Query Performance Risk

None. `readDiaries()` is a single synchronous `localStorage.getItem` parse capped at
~365 entries/year. Called once on mount inside `useEffect`.

## Seed / Fixture Impact

No changes to seed data. Test files reuse the existing `makeDiary(overrides?)`
factory from `src/lib/storage/__tests__/fixtures.ts`.

## Files Expected to Change

None in the storage or data layer. New file `src/lib/storage/useDiaries.ts` is a
React hook wrapper (client-only glue); it does not alter the storage contract or
schema and is explicitly NOT re-exported from the SSR-safe barrel.

The only additive change outside components is one CSS custom property
(`--color-cell-empty: #C8C8C8`) in `src/app/globals.css` — a presentational token
with no data relevance.

## Test Requirements

Storage-layer tests: `useDiaries.test.ts` verifies `isReady` lifecycle and that
`readDiaries()` output is surfaced correctly. Uses existing localStorage shim and
`makeDiary` fixture. No new storage test infrastructure required.

## Verdict
PASS — not applicable; REQ-007 consumes existing storage read-only.

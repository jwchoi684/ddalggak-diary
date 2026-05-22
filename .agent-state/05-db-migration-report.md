# Data Model / Migration Report — REQ-010

## Summary

REQ-010 (에디터 내 가로 캘린더 인라인 드롭다운) is a pure client-side UI feature. It reads
existing diary entries from localStorage and derives an in-memory lookup table. No storage schema
changes, no new keys, no migration, and no backfill are required.

## Schema Change Required

None. `DiaryEntry` in `src/lib/storage/types.ts` is unchanged. No new fields are added. No
existing fields are removed or widened.

## Migration Strategy

Not applicable. There is no database layer (this project uses localStorage only). No migration
script is needed.

## Backfill / Default / Nullability

Not applicable. The feature reads existing `DiaryEntry` records as-is. The `entryMap` (a
`Map<string, DiaryEntry>`) is built entirely in memory inside `useHorizontalDatePicker` by calling
the existing `readDiaries()` function. Missing entries for a given date are represented as
`undefined` — no default value is written back to storage.

## Index Requirements

Not applicable. `readDiaries()` performs a full O(n) scan over the localStorage array and indexes
results into an in-memory `Map<string, DiaryEntry>` keyed by `date`. For a 1-year active user
(n ≈ 365 entries) this is negligible. No persistent index is needed.

## Existing Data Compatibility

Full compatibility confirmed. The feature reads `ddalkkak:diaries:v1` entries written by earlier
REQs (REQ-002, REQ-009). All fields consumed (`date`, `mood`, `id`) already exist in the current
`DiaryEntry` schema. Entries with a falsy `mood` are handled gracefully (renders `•` placeholder
rather than crashing).

## Rollback Considerations

Not applicable. No storage structure is modified. Rolling back or removing this feature has zero
impact on existing localStorage data.

## Query Performance Risk

None. `readDiaries()` is called once per strip open event (recomputed via
`useMemo([isOpen])`), not on every render. 61-cell static render with no virtual scroll is well
within acceptable bounds.

## Seed / Fixture Impact

None. No seed or fixture files reference localStorage keys or `DiaryEntry` shape in a way that
would break.

## Files Expected to Change

- `src/lib/hooks/useHorizontalDatePicker.ts` — NEW (reads `readDiaries()`; no writes)
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` — NEW (pure UI)
- `src/app/diary/[date]/_components/DateCell.tsx` — NEW (pure UI)
- `src/app/diary/[date]/_components/Editor.tsx` — MODIFY (internal state only)
- `src/app/diary/[date]/_components/EditorBody.tsx` — MODIFY (props + render delta)

No storage files (`types.ts`, `keys.ts`, `diaries.ts`) are modified.

## Test Requirements

No migration-specific tests are needed. Data-layer concerns covered by existing REQ-002/REQ-009
tests. REQ-010 unit tests cover correct rendering based on `entryMap` presence/absence — those
are component tests, not migration tests.

## Verdict
PASS — not applicable (no schema or migration changes)

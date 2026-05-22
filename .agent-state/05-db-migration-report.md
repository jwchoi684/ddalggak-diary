# Data Model / Migration Report — REQ-009

## Summary

REQ-009 (일기 에디터) is the first real consumer of `upsertDiary` and `removeDiary`. No schema changes are needed and no migration is required.

## Schema Change Required

No. `DiaryEntry` in `src/lib/storage/types.ts` already contains all 8 fields:
`id`, `date`, `mood`, `text`, `textAlign: 'left' | 'center'`, `photos`, `createdAt`, `updatedAt`.
`textAlign` is required (not optional). The body field is `text`, not `body`. The API contract and technical design are aligned.

## Migration Strategy

Not applicable.

## Backfill / Default / Nullability

`textAlign` is required in TypeScript but old localStorage data from informal pre-REQ-009 testing could lack the field. The editor reads `entry.textAlign ?? 'left'` defensively in `LOAD_ENTRY` (confirmed in API contract Section 6 and technical design). No backfill script is needed.

## Index Requirements

Not applicable (localStorage, not a relational database).

## Existing Data Compatibility

Safe. `upsertDiary` uses two-step dedup: id-match first, date-match second. The editor calls `upsertDiary` with `state.persistedId ?? generateId()` — for a new unsaved entry the fresh id will miss the id-match and hit the date-match if a same-date entry exists, replacing it in-place. The 1-per-day invariant (PRD §9) is preserved in all paths.

`removeDiary(id: string)` is keyed on `DiaryEntry.id`. The editor only exposes delete when `state.persistedId` is defined (`hasSavedEntry === true`). Safe.

The localStorage key `ddalkkak:diaries:v1` is unchanged.

## Rollback Considerations

Not applicable. No structural change to the stored schema or key name.

## Query Performance Risk

None. `readDiaries()` is called once on mount inside `useEffect` and the result is filtered by `date`. At MVP scale (one entry per day, months of use) the array is tiny.

## Seed / Fixture Impact

`makeDiary` fixture factory in `src/lib/storage/__tests__/fixtures.ts` already populates `textAlign: 'left'`. No fixture changes are needed.

## Files Expected to Change

None in the storage layer. All new files are frontend-only (`_components/`, `src/lib/hooks/`, tests, E2E helpers).

## Test Requirements

Storage-layer tests (`diaries.test.ts`) already cover `upsertDiary` dedup and `removeDiary`. No new storage tests are required for REQ-009. Editor-layer tests (`Editor.test.tsx`, `useEditorState.test.ts`) will verify the correct fields are passed to `upsertDiary` and the correct id is passed to `removeDiary`.

## Verdict
PASS — not applicable (no schema or migration changes)

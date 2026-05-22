# Data Model / Migration Report — REQ-011

## Summary

REQ-011 adds photo attachment UI to the diary editor. All data model work was completed in REQ-002. This feature only populates an already-defined field. No schema changes, no migrations, and no new localStorage keys are required.

## Schema Change Required

No. `Photo` and `DiaryEntry.photos: Photo[]` are already defined in `src/lib/storage/types.ts` (lines 78–87 and 108 respectively). The storage layer (`diaries.ts`) round-trips the full `DiaryEntry` object through `JSON.parse` / `JSON.stringify` without any field projection, so a non-empty `photos` array persists correctly today.

## Migration Strategy

None needed.

## Backfill / Default / Nullability

Existing entries serialized before REQ-011 have `photos: []`. The storage layer returns entries as-is from JSON; callers are expected to use `entry.photos ?? []` to guard against entries that predate the field entirely. No backfill required.

## Index Requirements

None. localStorage has no index layer.

## Existing Data Compatibility

Fully backward-compatible. An entry with `photos: []` loads correctly; the carousel renders nothing and hides itself (per acceptance criteria). An entry with a populated `photos` array also loads without any migration.

## Rollback Considerations

No schema artifact to roll back. Removing the REQ-011 UI code leaves any stored `photos` arrays inert but harmless in localStorage. Data is not corrupted.

## Query Performance Risk

None for the storage layer itself. The only risk is localStorage quota exhaustion from large base64 payloads — this is a runtime concern documented in `limits.ts` and enforced by the `addPhotoFromFile()` utility (not a migration concern).

## Seed / Fixture Impact

No fixture changes required. Existing fixtures in `src/lib/storage/__tests__/fixtures.ts` that set `photos: []` remain valid. Optionally, test-level fixtures for REQ-011 unit tests may construct `Photo` objects inline without touching shared fixtures.

## Files Expected to Change

None in the data/storage layer. The two constants that serve as the source of truth are already present:

- `src/lib/storage/types.ts` — `Photo` interface, `DiaryEntry.photos`
- `src/lib/storage/limits.ts` — `MAX_PHOTOS_PER_ENTRY = 10`, `MAX_PHOTO_DATAURL_BYTES = 150 * 1024`

## Test Requirements

No new storage-layer tests required for migration. REQ-011 implementation tests (`photoBase64.test.ts`) validate count/size guards at the utility level, which is correct placement.

## Verdict
PASS

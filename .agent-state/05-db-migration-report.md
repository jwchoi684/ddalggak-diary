# Data Model / Migration Report

## Summary

REQ-005 delivers seven presentational UI primitives, two ephemeral-state hooks,
eight Vitest spec files, and two additive CSS token lines plus one CSS rule in
`globals.css`. No data layer is involved at any level.

## Schema Change Required

None. REQ-005 touches only `src/design-system/` (new files) and
`src/app/globals.css` (additive tokens). The existing storage schema —
`DiaryEntry`, `SearchConversation`, `Settings`, and their localStorage keys
(`ddalkkak:diaries:v1`, `ddalkkak:conversations:v1`, `ddalkkak:settings:v1`) —
is entirely untouched.

## Migration Strategy

Not applicable. No migration file is required.

## Backfill / Default / Nullability

Not applicable. No stored fields are added, removed, or retyped.

## Index Requirements

Not applicable.

## Existing Data Compatibility

Full compatibility preserved. `src/lib/storage/types.ts` and all sibling
storage modules are read-only from REQ-005's perspective; none of the seven
primitives or two hooks import from `src/lib/storage/`.

## Rollback Considerations

Not applicable. CSS token additions are additive and safe to revert by
removing two lines from `@theme {}`. No data is written anywhere.

## Query Performance Risk

None. REQ-005 contains no data access paths.

## Seed / Fixture Impact

None. `src/lib/storage/__tests__/fixtures.ts` is not modified.

## Files Expected to Change

- `src/app/globals.css` — additive: `--shadow-card`, `--color-danger` tokens;
  `dialog::backdrop` rule.
- `src/design-system/Card.tsx` (new)
- `src/design-system/EmptyState.tsx` (new)
- `src/design-system/IconButton.tsx` (new)
- `src/design-system/FAB.tsx` (new)
- `src/design-system/useDialogControl.ts` (new)
- `src/design-system/BottomSheet.tsx` (new)
- `src/design-system/ConfirmDialog.tsx` (new)
- `src/design-system/Toast.tsx` (new)
- `src/design-system/useToast.ts` (new)
- `src/design-system/__tests__/*.test.{tsx,ts}` — 8 new spec files

No storage, schema, migration, seed, or fixture file is modified.

## Test Requirements

Vitest specs assert render behavior and prop contracts only. No storage mock,
no `localStorage` stub, and no fixture setup is required for any of the eight
spec files. `useToast.test.ts` uses `vi.useFakeTimers()` for timer control —
this is in-memory only and carries no persistence side-effects.

## Verdict
PASS — not applicable; REQ-005 is presentational primitives only.

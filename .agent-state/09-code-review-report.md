# Code Review — REQ-019

Backup utility (pure), settings page with gated import modal, pre-validate before apply.

## Invariants
- validateBackup never throws ✓
- applyBackup gated behind validateBackup ✓
- overwrite vs merge modes distinct ✓
- existing data preserved on invalid file ✓
- Korean strings exact ✓
- Settings entry point via calendar header gear icon ✓

## Non-Blocking
- 17 test cases on backup.test.ts is generous coverage
- Future: cloud sync (P2)

## Verdict
PASS

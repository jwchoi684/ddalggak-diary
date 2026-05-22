# Contract — REQ-019

## backup.ts interfaces
- `BackupV1` shape: `{ version: 1, diaries: DiaryEntry[], conversations: SearchConversation[], settings: Record<string, unknown> }`
- `buildBackup() → BackupV1`
- `exportBackup() → void` (side effect: triggers download)
- `validateBackup(text) → { ok, backup } | { ok: false, reason }` — NEVER throws
- `applyBackup(backup, mode)` — overwrite | merge

## Storage Writes
- overwrite: replaces all 3 localStorage keys
- merge: dedup, existing wins
- `writeAllSettings(settings)` added to settings.ts

## Routes
- `Routes.settings = '/settings'` added

## Caller Invariants
1. validateBackup BEFORE applyBackup (pre-validate)
2. existing data never corrupted on invalid file
3. version mismatch → safe reject

## Verdict
PASS

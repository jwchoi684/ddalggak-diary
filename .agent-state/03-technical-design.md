# Design — REQ-019

## backup.ts
```ts
interface BackupV1 { version: 1; diaries: DiaryEntry[]; conversations: SearchConversation[]; settings: Record<string, unknown>; }
export function buildBackup(): BackupV1
export function exportBackup(): void
export function validateBackup(text: string): { ok: true; backup: BackupV1 } | { ok: false; reason: string }
export function applyBackup(backup: BackupV1, mode: 'overwrite' | 'merge'): void
```

- Filename: `ddalkkak-backup-YYYYMMDD-HHmm.json`
- Validate: parse JSON, check version===1, check arrays
- Apply overwrite: replace all 3 keys
- Apply merge: dedup by date (diaries) and id (conversations), existing wins

## Settings Page
- Two buttons: 내보내기 / 가져오기
- File input accept=".json"
- Pre-validate → ImportModeDialog (덮어쓰기/머지/취소) → applyBackup → router.refresh() + toast
- Invalid file → toast "파일 형식이 올바르지 않아요"

## Entry Point
CalendarHeader adds gear icon → router.push(Routes.settings).

## Verdict
PASS

# Frontend Implementation — REQ-019

## Summary

REQ-019: JSON 백업 내보내기/가져오기. Implements a pure backup utility module, a `/settings` route with export and import UI, and a settings entry point from the calendar header gear icon. All data is validated pre-apply, preventing corruption on invalid file upload.

## Files Changed

### New production files

| File | Lines | Purpose |
|---|---|---|
| `src/lib/backup/backup.ts` | 176 | Pure backup utility: `buildBackup`, `exportBackup`, `validateBackup`, `applyBackup` |
| `src/app/settings/page.tsx` | 197 | Settings screen with "백업 내보내기" and "백업 가져오기" buttons, file input, ImportModeDialog, Toast |

### Modified production files

| File | Change |
|---|---|
| `src/lib/storage/settings.ts` | Added `writeAllSettings(settings)` — full-replace primitive needed by backup restore |
| `src/lib/storage/index.ts` | Re-exports `writeAllSettings` |
| `src/lib/navigation/routes.ts` | Added `Routes.settings = '/settings'` |
| `src/app/_components/CalendarHeader.tsx` | Added optional `onSettings?` prop + gear `SettingsIcon` + IconButton render |
| `src/app/_components/CalendarScreen.tsx` | Passes `onSettings={() => router.push(Routes.settings)}` to `CalendarHeader` |

### New test files

| File | Lines | Cases |
|---|---|---|
| `src/lib/backup/__tests__/backup.test.ts` | 323 | 17 (BU1–BU6, multiple per group) |
| `src/app/settings/__tests__/page.test.tsx` | 191 | 5 (SP1–SP3) |

## Behavior Added

1. `buildBackup()` reads all three localStorage keys via existing storage layer functions and returns a `BackupV1` object.
2. `exportBackup()` serializes `buildBackup()` output to JSON, creates a Blob URL, simulates an anchor click to trigger download with filename `ddalkkak-backup-YYYYMMDD-HHmm.json`, then revokes the URL. No-op during SSR.
3. `validateBackup(text)` parses JSON, checks `version === 1`, verifies `diaries` and `conversations` are arrays. Returns `{ ok: false, reason }` on any failure; never throws. Settings field absent → defaults to `{}`.
4. `applyBackup(backup, 'overwrite')` replaces all three keys directly using `writeAllDiaries`, `writeAllConversations`, `writeAllSettings`.
5. `applyBackup(backup, 'merge')` deduplicates by date (diaries) and id (conversations) — existing wins on conflict. Settings are shallow-merged with existing keys taking precedence.
6. `/settings` page renders "백업 내보내기" and "백업 가져오기" buttons.
7. Import: hidden `<input type="file" accept=".json">` reads file text, calls `validateBackup`. Invalid → toast "파일 형식이 올바르지 않아요" (no mutation). Valid → shows `ImportModeDialog` with "덮어쓰기" and "머지" choices.
8. On mode confirm: `applyBackup(backup, mode)` → toast "가져오기를 완료했어요" → `router.refresh()`.
9. Settings icon (gear) added to `CalendarHeader` right cluster; links to `/settings`.

## Existing Patterns Reused

- `Toast` + `useToast` from `@/design-system` — identical usage to `Editor.tsx` and `ActiveChatPage`.
- `IconButton` from `@/design-system/IconButton` — back button in settings header.
- `readDiaries`, `writeAllDiaries`, `readConversations`, `writeAllConversations`, `readSettings` from `@/lib/storage` — no new localStorage access outside the storage layer.
- `useRouter` from `next/navigation` + `router.back()` / `router.refresh()` — same pattern as all other pages.
- `Routes` from `@/lib/navigation` — typed route builder.
- Test pattern: `@vitest-environment happy-dom` + `vi.mock` + top-level `await import` — consistent with all UI tests.
- `setupNextNavigation` helper — same mock setup used by settings page test.
- `no-direct-localstorage-access` constraint respected: backup module only calls functions from `@/lib/storage`, never accesses `localStorage` directly.

## Tests Added / Updated

**`src/lib/backup/__tests__/backup.test.ts`** — 17 cases:
- BU1: `buildBackup` returns `version: 1` with arrays; returns empties when storage is cold.
- BU2: `validateBackup` accepts well-formed JSON; accepts missing settings (defaults to `{}`).
- BU3: `validateBackup` rejects non-JSON text; rejects empty string.
- BU4: `validateBackup` rejects version `2`; rejects missing version; rejects non-array `diaries`; rejects `null` `conversations`.
- BU5: `applyBackup` overwrite replaces all three stores; clears stores when backup arrays are empty.
- BU6: `applyBackup` merge keeps existing diary on date collision; appends when date is unique; keeps existing conv on id collision; appends when id is unique; existing settings keys win on conflict.

**`src/app/settings/__tests__/page.test.tsx`** — 5 cases:
- SP1: export button calls `exportBackup()` and shows "백업 파일을 저장했어요" toast.
- SP2: invalid file → `validateBackup` returns `ok: false` → error toast shown, `applyBackup` NOT called.
- SP3a: valid file → mode dialog appears → "덮어쓰기" → `applyBackup(backup, 'overwrite')` called + `router.refresh()`.
- SP3b: valid file → "머지" → `applyBackup(backup, 'merge')` called.
- SP3c: cancel in mode dialog → `applyBackup` NOT called, dialog dismissed.

## Commands Run

```
npx tsc --noEmit        → 0 errors
npm run lint            → 0 warnings / 0 errors
npx vitest run          → 400/400 passed (60 test files)
```

## Risks / Follow-ups

1. `exportBackup` creates a DOM anchor element for download. In test environments (happy-dom), `URL.createObjectURL` may not be available. The settings page test mocks `exportBackup` entirely to avoid this, which is the correct approach.
2. `applyBackup` merge mode for diaries deduplicates by `date` (enforcing the one-per-day invariant). If the same diary has both a new id and a conflicting date from a different device, the existing entry wins. The PRD's merge-on-conflict rule ("keep existing") is consistently applied.
3. `settings.ts` grew from 46 → 59 lines with `writeAllSettings`. Remains well within the 100-line guideline.
4. `CalendarHeader.tsx` is now 102 lines with the gear icon; within tolerance per the guideline's note on SVG/constant data.
5. No E2E test covers the full export → import round-trip in a real browser. Recommended as a Playwright spec in a follow-up.

## Verdict
PASS

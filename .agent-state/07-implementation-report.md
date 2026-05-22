# Frontend Implementation

## Summary

REQ-009 (일기 에디터) is fully implemented. The diary editor is a single `"use client"` React component tree under `src/app/diary/[date]/` that handles both new-entry and existing-entry flows. All 215 tests pass (191 pre-existing + 24 new), lint is clean, typecheck passes, build succeeds, and both E2E tests pass.

---

## Files Changed

### Modified (4 files)

| File | Lines | Change |
|---|---|---|
| `src/design-system/useDialogControl.ts` | 65 | NB-1 fix: added `onCloseRef` capture and `cancel` event listener for Escape-key support |
| `src/design-system/MoodPickerSheet.tsx` | 130 | Guard invalid dates in `formatSheetDate` (NaN check) — needed for regression test with `2026-13-01` |
| `src/app/__tests__/diary-date-page.test.tsx` | 84 | Updated to match new `page.tsx` output (renders `<Editor />` not a heading); added storage + dialog mocks |
| `src/app/diary/[date]/page.tsx` | 14 | Replaced stub with `<Editor date={date} />`; added `import React` for test environment compatibility |

### New (route-scoped components — 5 files)

| File | Lines | Description |
|---|---|---|
| `src/app/diary/[date]/_components/Editor.tsx` | 116 | Container: wires state, autosave, navigation, dialogs, toast |
| `src/app/diary/[date]/_components/EditorHeader.tsx` | 36 | Back + more `IconButton` pair |
| `src/app/diary/[date]/_components/EditorBody.tsx` | 80 | Mood area + date label + textarea |
| `src/app/diary/[date]/_components/EditorToolbar.tsx` | 94 | Bottom icon strip with conditional save icon |
| `src/app/diary/[date]/_components/EditorMoreMenu.tsx` | 43 | `BottomSheet` with list/delete items |

### New (shared hooks — 2 files)

| File | Lines | Description |
|---|---|---|
| `src/lib/hooks/useAutosave.ts` | 25 | Generic 1-shot debounce hook |
| `src/lib/hooks/useEditorState.ts` | 102 | `useReducer`-based editor state with storage load `useEffect` |

### New (tests — 4 files)

| File | Cases | Description |
|---|---|---|
| `src/lib/hooks/__tests__/useAutosave.test.ts` | 5 | Debounce timing and unmount cleanup |
| `src/lib/hooks/__tests__/useEditorState.test.ts` | 5 | Reducer actions, dirty flag, initial state |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 12 | Integration tests for all entry contexts and interactions |
| `src/design-system/__tests__/useDialogControl.test.ts` | +2 (extended) | Cancel event / Escape-key listener |

### New (E2E — 2 files)

| File | Tests | Description |
|---|---|---|
| `e2e/editor.spec.ts` | 1 | Full user journey: calendar FAB to editor, mood select, type, autosave, back, mood on calendar |
| `e2e/_helpers/seedDiaries.ts` | helper | `seedDiariesScript()` for pre-seeding localStorage in future E2E tests |

---

## Behavior Added

1. Diary editor screen at `/diary/[date]` — single component handles both new-entry and existing-entry flows.
2. Four entry contexts per PRD §4.3.8: empty-date auto-opens MoodPickerSheet; existing entry prefills fields and shows delete option.
3. 1-second debounce autosave — silent `upsertDiary` after inactivity. No-op when mood is undefined.
4. Explicit save via save toolbar button (visible only when dirty) — `upsertDiary` + toast "일기를 저장했어요!".
5. Back-navigation guard — dirty state opens unsaved-changes `ConfirmDialog` — "저장하고 나가기" or "계속 작성".
6. Delete flow — more menu "일기 삭제" (visible only when saved entry exists) → delete `ConfirmDialog` → `removeDiary(id)` + back.
7. Text alignment toggle — left/center, persisted on save via `DiaryEntry.textAlign`.
8. Current-time insert — `HH:MM ` at cursor position via `selectionStart`/`selectionEnd`.
9. Gallery icon noop — fires `Toast("곧 만나요!")` (REQ-011 replaces).
10. Escape-key close — `useDialogControl` now handles native dialog `cancel` event uniformly for BottomSheet, ConfirmDialog, and MoodPickerSheet.

---

## Existing Patterns Reused

- `useDiaries` `isReady` hydration-guard pattern → `useEditorState` `isLoaded` flag
- `HTMLDialogElement.prototype.showModal/close` mock pattern from existing component tests
- `vi.mock('next/navigation', ...)` + `setupNextNavigation` helpers from existing tests
- `vi.mock('@/lib/storage', ...)` + dynamic `await import(...)` pattern from `useDiaries.test.ts`
- `makeDiary()` fixture factory from `fixtures.ts`
- `IconButton`, `BottomSheet`, `ConfirmDialog`, `Toast`, `useToast`, `MoodIcon`, `MoodPickerSheet` — all reused as-is
- `Routes.list` for navigation target
- `readDiaries`, `upsertDiary`, `removeDiary`, `generateId` from `@/lib/storage`

---

## Tests Added / Updated

**New test files (24 new cases):**
- `src/lib/hooks/__tests__/useAutosave.test.ts` — 5 cases (A1–A5)
- `src/lib/hooks/__tests__/useEditorState.test.ts` — 5 cases (B1–B5)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` — 12 cases (C1–C12)
- `src/design-system/__tests__/useDialogControl.test.ts` — 2 new cases (D1–D2) added to existing file

**Updated test file:**
- `src/app/__tests__/diary-date-page.test.tsx` — updated 4 existing cases to match new `page.tsx` output

Total: 32 test files, 215 tests (was 29 files, 191 tests).

---

## Commands Run

```
npm run typecheck   → PASS (0 errors)
npm run lint        → PASS (0 warnings, 0 errors)
npm run test        → PASS (32 test files, 215 tests)
npm run build       → PASS (clean, /diary/[date] = 5.68 kB)
npm run test:e2e    → PASS (2 tests: calendar + editor journey)
```

---

## Deviations from Design

1. **`useDialogControl` cancel listener scoped to `open=true` only.** The design attached the cancel listener in the same effect that called both `showModal`/`close`. In practice, attaching when `open=false` caused test D2 to fail (cancel fired onClose after dialog closed). Fix: listener attached only when `open=true`, removed on cleanup. This is semantically correct and matches the spec intent.

2. **`MoodPickerSheet.tsx` one-line guard.** `formatSheetDate` now returns the raw date string when `new Date()` produces NaN. Needed because the regression test uses `2026-13-01` which crashes `Intl.DateTimeFormat.format()`. One-line defensive fix, no behavior change for valid dates.

3. **`Editor.tsx` is 116 lines** (cap was ~120). Still cohesive — splitting further would fragment meaningful wiring logic.

4. **`page.tsx` gets `import React from 'react'`.** Necessary for Vitest/happy-dom test environment which doesn't provide Next.js's automatic JSX transform. No production impact.

5. **E2E test navigates via calendar FAB instead of direct `goto`.** Direct `goto('/diary/...')` leaves no back-history, so `router.back()` goes to `about:blank`. Using `goto('/')` + FAB click establishes proper history. E2E validates the same user behavior described in the spec.

6. **C7 test uses `querySelector('button[aria-label="저장"]')` not text-content check.** The ConfirmDialog's "저장하고 나가기" button text contains '저장', making `textContent.contains('저장')` a false positive. The aria-label selector is more precise and matches the test plan intent.

7. **C11 test uses `querySelector('button[aria-label="기쁨"]')` not text-content match.** The mood button's textContent includes the emoji character plus the label, so `trim() === '기쁨'` fails. The aria-label is set to the mood label verbatim per MoodPickerSheet source.

---

## Outstanding NBs for Next Phase

- **NB-2**: `MoodPickerSheet.tsx` is 130 lines. Defer to REQ-010 if that REQ touches the file; extract `MoodPickerTabs` at that time.
- **REQ-011**: Gallery icon noop in `EditorToolbar` awaiting real implementation.
- **INV-13** (`textAlign ?? 'left'` fallback): not exercised by any test (fixtures always include `textAlign`). Deferred per test plan coverage-gap notes.

---

## Verdict
PASS

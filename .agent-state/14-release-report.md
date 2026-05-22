# Release Report

## Summary

REQ-009 delivers the full diary editor at route `/diary/[date]`. This is a unified new-entry and edit-entry screen (no separate routes or components). The implementation covers: a four-sub-component editor (`EditorHeader`, `EditorBody`, `EditorToolbar`, `EditorMoreMenu`), a `useEditorState` reducer hook, a `useAutosave` debounce hook, 1-second silent autosave to localStorage, explicit save with a "일기를 저장했어요!" toast, dirty-state back-navigation guard, mood picker integration (auto-open on empty entry, tap-to-change on existing entry), and time-insert functionality. Two design-system touch-ups are included: a `useDialogControl` NB-1 fix (Escape key cancel event), and a defensive guard in `MoodPickerSheet.formatSheetDate` for invalid date strings. All 10 required gate reports are PASS. Test count moved from 191 to 215 (+ 24 unit/integration tests, +1 E2E). Build output for the route is 5.68 kB.

## Files Changed

**New source files:**
- `src/app/diary/[date]/_components/Editor.tsx` (container, 171 lines)
- `src/app/diary/[date]/_components/EditorHeader.tsx` (33 lines)
- `src/app/diary/[date]/_components/EditorBody.tsx` (84 lines)
- `src/app/diary/[date]/_components/EditorToolbar.tsx` (108 lines)
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx` (46 lines)
- `src/lib/hooks/useAutosave.ts` (26 lines)
- `src/lib/hooks/useEditorState.ts` (110 lines)
- `src/lib/hooks/__tests__/useAutosave.test.ts` (5 unit tests)
- `src/lib/hooks/__tests__/useEditorState.test.ts` (5 unit tests)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` (12 integration tests)
- `e2e/editor.spec.ts` (1 Playwright E2E test)
- `e2e/_helpers/seedDiaries.ts` (localStorage seed helper for E2E)

**Modified source files:**
- `src/app/diary/[date]/page.tsx` — stub replaced by real editor wiring + date validation
- `src/design-system/useDialogControl.ts` — NB-1 fix: native `cancel` event listener for Escape key
- `src/design-system/__tests__/useDialogControl.test.ts` — +2 cases validating NB-1 fix
- `src/design-system/MoodPickerSheet.tsx` — defensive `isNaN` guard in `formatSheetDate`
- `src/app/__tests__/diary-date-page.test.tsx` — updated to match real editor (textarea assertions, dialog mock)

**Agent state files (all REQ-009 content):**
- `.agent-state/00-git-safety.md` through `.agent-state/13-e2e-report.md` (all updated for REQ-009)
- `.agent-state/architecture-report.md`, `.agent-state/security-report.md`, `.agent-state/test-plan.md`, `.agent-state/test-report.md` (alias/mirror copies)
- `.agent-state/requirements/REQ-009.md` — status updated to DONE
- `.agent-state/requirements/index.md` — REQ-009 row updated to DONE

No unrelated production files are present in the working tree.

## Gate Status

| # | Report | Verdict |
|---|---|---|
| 01 | Requirement Intake | PASS |
| 02 | Architecture Report | PASS |
| 03 | Technical Design | PASS |
| 04 | API Contract | PASS |
| 05 | DB Migration Report | PASS — not applicable (localStorage, no schema change) |
| 06 | Test Plan | PASS |
| 08 | Test Report | PASS (215/215 tests, 32 test files) |
| 09 | Code Review Report | PASS (6 non-blocking items, 0 blocking) |
| 10 | Security Report | PASS (2 LOW informational, 0 critical/high/medium) |
| 11 | Performance Report | PASS |
| 12 | Infra Report | PASS — pure frontend, no infra changes |
| 13 | E2E Report | PASS (2/2 Playwright tests) |

## Tests Run

- `npm run typecheck` — PASS (0 TypeScript errors)
- `npm run lint` — PASS (0 ESLint errors/warnings)
- `npm test` — PASS (215 tests, 32 files, 0 failures)
- `npm run build` — PASS (clean production build, `/diary/[date]` = 5.68 kB)
- `npm run test:e2e` — PASS (2/2 Playwright tests, 17.9 s)

New test files:
- `src/lib/hooks/__tests__/useAutosave.test.ts` — 5 cases (A1–A5: timer setup, debounce, no-call on unmount, zero-delay, value-change reset)
- `src/lib/hooks/__tests__/useEditorState.test.ts` — 5 cases (E1–E5: initial state, LOAD_ENTRY, SET_MOOD, SET_TEXT, MARK_SAVED)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` — 12 cases (C1–C10 + 2 extras: autosave, explicit save, dirty guard, mode transitions, delete flow)
- `src/design-system/__tests__/useDialogControl.test.ts` — +2 cases (D1: Escape fires onClose; D2: Escape after close=false does not re-fire)
- `e2e/editor.spec.ts` — 1 Playwright journey (calendar → FAB → mood pick → type → autosave → back → calendar shows mood emoji)

## Review Status

Code Review: PASS. 6 non-blocking suggestions, 0 blocking issues. 14/14 contract invariants satisfied. All 215 tests pass. Architecture consistency confirmed.

Non-blocking items from code review (deferred):
- NB-1: API contract save-icon sentence deviates from implementation (implementation correctly follows technical design; contract to be corrected)
- NB-2: `Editor.tsx` is 171 lines — extract `EditorDialogs.tsx` to reduce to ~140
- NB-3: `EditorToolbar.tsx` SVG constants inflate to 108 lines — extract to shared icons file (REQ-011 will need GalleryIcon)
- NB-4: `handleSaveAndBack` could add defensive `isLoaded` guard
- NB-5: C7 test does not assert save-icon disappears after explicit save
- NB-6: `EditorMoreMenu` list-view button missing `aria-label`

## Security Status

Security Review: PASS. No critical, high, or medium issues. Two LOW informational items accepted:
- LOW-1: `new Function` in `e2e/_helpers/seedDiaries.ts` — test-only, not production, not exploitable
- LOW-2: `parsed as DiaryEntry[]` type assertion without per-element validation — single-user localStorage, no cross-origin write vector, no XSS path; acceptable for MVP

## E2E Status

E2E Report: PASS. 2/2 Playwright tests pass (17.9 s, Chromium). Core editor journey verified end-to-end: calendar FAB → mood picker → text entry → 1-second autosave → back navigation → calendar mood emoji update.

Two E2E risks noted (non-blocking):
- `editor.spec.ts` uses `page.waitForTimeout(1500)` fixed sleep; a `waitForFunction` polling localStorage would be more robust for CI
- E2E date dependency on `aria-label="오늘 일기 쓰기"` FAB label

## Performance / Infra Status

Performance: PASS. Autosave debounce is textbook correct (no timer leaks, no amplification). `saveFn`/`autosaveValue` memoization prevents spurious timer resets on unrelated renders. localStorage read is once on mount. Route bundle is 5.68 kB. No new dependencies.

Infra: PASS. Pure frontend change. No env vars, CI workflows, Docker, or cloud resources added. No new runtime dependencies. Rollback is a standard git revert; no orphaned cloud state.

Performance non-blocking suggestions (deferred):
- Perf-1: Memoize `EditorHeader`/`EditorToolbar` with `React.memo` if they grow
- Perf-2: `useLayoutEffect` with no dep array could use `[state.text]` for clarity
- Perf-3: `upsertDiary` double-read on new entry creation; future `appendDiary` variant could skip the read

Infra non-blocking suggestions (deferred):
- Infra-1: Replace `waitForTimeout(1500)` with `waitForFunction` polling in E2E
- Infra-2: Replace `new Function` in seedDiaries with `page.addInitScript(fn, arg)` pattern
- Infra-3: Document Playwright binary install in CI pipeline when one is added

## Commit Message

```
feat: diary editor with autosave (REQ-009)

- Single editor component handles new-entry and edit-entry (4 sub-components + 2 hooks)
- 1-second debounce silent autosave; explicit save shows "일기를 저장했어요!" toast
- Dirty-state back-navigation guard; useDialogControl Escape-key fix (NB-1)
```

## PR Body

```md
## Summary

- Delivers the diary editor at `/diary/[date]` as a unified new/edit screen
- 1-second debounce autosave to localStorage; explicit save with toast confirmation
- Dirty-state navigation guard (ConfirmDialog before router.back()); mood picker integration (auto-open for new entry, tap-to-change for existing)
- `useDialogControl` Escape-key cancel event fix (REQ-008 NB-1); defensive guard in `MoodPickerSheet.formatSheetDate`

## Acceptance Criteria

- [ ] New empty date: MoodPickerSheet auto-opens; delete menu item hidden
- [ ] Existing date: data prefilled; no auto-open; delete shown
- [ ] Autosave fires silently 1 second after last keystroke
- [ ] Explicit save button shows toast
- [ ] Dirty + back opens unsaved-changes dialog; clean back navigates immediately
- [ ] 215/215 unit tests pass; 2/2 E2E tests pass

## Technical Notes

- `useEditorState` uses `useReducer`; `useAutosave` handles timer lifecycle
- `saveFn` uses `state.persistedId ?? generateId()` with stable `useCallback` to prevent duplicate entries across autosave cycles
- `createdAt` preserved on update via `state.persistedCreatedAt ?? new Date().toISOString()`

## API / Interface Changes

None. No new API routes. Route `/diary/[date]` was already declared (stub from REQ-006); this replaces the stub body.

## Data / Migration Notes

All persistence is localStorage under `ddalkkak:diaries:v1`. No schema change. Rollback does not corrupt stored data.

## Tests

215 unit/integration tests + 2 E2E. New test files: `useAutosave.test.ts` (5), `useEditorState.test.ts` (5), `Editor.test.tsx` (12), `useDialogControl.test.ts` (+2), `e2e/editor.spec.ts` (1).

## Security Review

PASS. No critical/high/medium issues. Two LOW informational items (test-only `new Function`, storage type assertion without element validation) accepted for MVP scope.

## E2E Evidence

2/2 Playwright tests pass (Chromium, 17.9 s). Full user journey from calendar to editor to autosave to back verified.

## Risk / Rollback Plan

Standard git revert. No server state, no migrations, no cloud resources. localStorage data is preserved across UI rollback.
```

## Remaining Risks

1. E2E fixed sleep (`waitForTimeout(1500)`) — passes now, may be fragile in constrained CI environments
2. `Editor.tsx` at 171 lines (NB-2) — functional but above the 100-line guideline; refactor recommended at start of REQ-010
3. `EditorToolbar.tsx` SVG constants (NB-3) — extract to icons file before REQ-011 adds GalleryIcon
4. `new Function` in E2E helper (LOW-1/Infra-2) — cosmetic; replace with `page.addInitScript(fn, arg)` pattern
5. Storage type assertion without element validation (LOW-2) — revisit before any export/import or cloud-sync feature

## Verdict
PASS

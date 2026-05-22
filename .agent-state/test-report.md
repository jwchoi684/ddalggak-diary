# Test Report — REQ-009 (일기 에디터)

## Summary

Independent verification of the REQ-009 implementation. All five verification commands passed with exit code 0. Total test count is 215 (32 test files), matching the claimed delta of +24 from a pre-REQ-009 baseline of 191. All new test files meet or exceed their minimum case counts. No skipped, `.only`, or `.skip` tests were found. The E2E suite expanded from 1 to 2 tests and both pass.

---

## Verification Results

| Command | Exit Code | Result | Notes |
|---|---|---|---|
| `npm run typecheck` | 0 | PASS | 0 TypeScript errors |
| `npm run lint` | 0 | PASS | 0 ESLint warnings or errors (deprecation notice for `next lint` is cosmetic only) |
| `npm test` | 0 | PASS | 32 test files, 215 tests, 0 failures |
| `npm run build` | 0 | PASS | Clean production build; `/diary/[date]` = 5.68 kB |
| `npm run test:e2e` | 0 | PASS | 2 Playwright tests pass (calendar + editor journey) |

---

## Test Case Audit (counts per file)

| File | `it()` / `test()` blocks | Requirement | Delta vs pre-REQ-009 |
|---|---|---|---|
| `src/lib/hooks/__tests__/useAutosave.test.ts` | 5 | >= 5 | New file (+5) |
| `src/lib/hooks/__tests__/useEditorState.test.ts` | 5 | >= 5 | New file (+5) |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 12 | >= 12 | New file (+12) |
| `src/design-system/__tests__/useDialogControl.test.ts` | 7 (was 5 at commit 43310cb) | +2 new | +2 confirmed via git show |
| `e2e/editor.spec.ts` | 1 | >= 1 | New file (+1 Playwright test) |

All counts meet expectations. No `.only`, `.skip`, `xtest`, or `xit` modifiers present in any of the new files.

---

## Spot Checks

### C4 - Autosave called silently after 1 s

`Editor.test.tsx` lines 115-131. The test seeds an entry with `mood: 'joy'` (so `saveFn` guard passes), fires `fireEvent.change` on the textarea, advances fake timers by 1000 ms, then asserts:
- `expect(upsertDiaryMock).toHaveBeenCalledTimes(1)` - silent call happened once
- `expect(upsertDiaryMock).toHaveBeenCalledWith(expect.objectContaining({ text: '새 내용', date: '2026-05-15' }))` - correct payload
- `expect(document.body.textContent).not.toContain('일기를 저장했어요!')` - no toast rendered

All three assertions present and correct.

### C6 - Explicit save shows toast

`Editor.test.tsx` lines 145-161. After typing, the test clicks the `aria-label="저장"` button and asserts:
- `expect(upsertDiaryMock).toHaveBeenCalledTimes(1)` - storage write happened
- `expect(upsertDiaryMock).toHaveBeenCalledWith(expect.objectContaining({ text: '수정됨' }))` - correct text
- `expect(document.body.textContent).toContain('일기를 저장했어요!')` - toast visible

All three assertions present and correct.

### C8 - Dirty + back opens unsaved dialog (not router.back)

`Editor.test.tsx` lines 173-185. After changing textarea text, the test clicks `aria-label="뒤로가기"` and asserts:
- `expect(document.body.textContent).toContain('저장되지 않은 변경사항이 있어요')` - dialog copy visible
- `expect(mockRouter.back).not.toHaveBeenCalled()` - navigation blocked

Both assertions present and correct.

### useDialogControl delta confirmation

`git show 43310cb:src/design-system/__tests__/useDialogControl.test.ts` yields 5 `it()` blocks. The current file has 7 `it()` blocks. The two new cases (lines 97-127) are:
- D1: `cancel event (Escape key) calls onClose` - dispatches a `cancel` event and asserts `onClose` called once
- D2: `cancel event after open=false does not call onClose again` - transitions to `open=false`, then dispatches `cancel` and asserts no additional `onClose` calls

Both cases are substantive and validate the NB-1 fix correctly.

---

## Coverage Notes

The following deferred gaps from the test plan remain non-blocking:

1. `textAlign` not asserted in explicit-save payload (C6 uses `objectContaining` without `textAlign`).
2. `textAlign ?? 'left'` fallback for legacy data (INV-13) - fixtures always provide `textAlign`.
3. Combined "Escape on MoodPickerSheet in mode=initial" chain test - deferred.
4. More-menu delete item hidden for new entry verified indirectly (C1 scans all button text) but not by opening the menu for a new entry.

None of these are blockers.

---

## Remaining Risks

- **E2E date dependency**: the `editor.spec.ts` test dynamically uses today's date. If the calendar FAB's `aria-label` changes or is not `"오늘 일기 쓰기"`, the test will break. Currently passes against the live app.
- **E2E history dependency**: the test navigates via `goto('/')` + FAB to establish history for `router.back()`. A direct `goto('/diary/...')` would break back navigation in the browser. This is a known intentional design (noted in implementation deviations).

---

## Verdict
PASS

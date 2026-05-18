# Test Report — REQ-008: 무드 선택 바텀시트 모달

## Summary

Independent verification run for REQ-008 (Phase 9 landing). Two new files were inspected and
all four quality gates were executed from the repo root. All 10 specified test cases from the
test plan are present in `MoodPickerSheet.test.tsx`. No regressions in the pre-existing 181-test
baseline. Full suite: 191/191 tests pass across 29 files.

---

## Tests Added / Updated

### New — test file

`src/design-system/__tests__/MoodPickerSheet.test.tsx` — 10 `it()` blocks inside one `describe`.

| # | it() description | TC from plan | Status |
|---|---|---|---|
| 1 | `open=true calls showModal` | TC-1a | PRESENT |
| 2 | `open=false calls close` | TC-1b | PRESENT |
| 3 | `renders formatted date and title in header` | TC-2 | PRESENT |
| 4 | `renders a button for each of the 10 moods` | TC-3 | PRESENT |
| 5 | `tapping a mood calls onSelect then onClose; does not call onCancelInitial` | TC-4 | PRESENT |
| 6 | `X button in change mode calls onClose once, not onCancelInitial` | TC-5/7 (merged) | PRESENT |
| 7 | `X button in initial mode calls onCancelInitial then onClose` | TC-6 | PRESENT |
| 8 | `tapping an inactive tab shows the 곧 만나요! toast` | TC-8 | PRESENT |
| 9 | `joy button has ring-2 and ring-peach when selectedMoodId="joy"` | TC-9 | PRESENT |
| 10 | `MoodPickerSheet.tsx has "use client" directive` | TC-10 | PRESENT |

Coverage notes per plan:

- **TC-5 and TC-7 merged** — both assertions (`onClose` once, `onCancelInitial` not called in
  `mode='change'`) are in the single `it` block at line 90. The plan explicitly permits this merge
  when budget is tight.
- **TC-6 call-order guard** — `invocationCallOrder[0]` comparison is present (line 108), confirming
  `onCancelInitial` fires before `onClose`.
- **TC-4 call-order guard** — `invocationCallOrder[0]` comparison is present (line 87).
- **TC-8** — both inactive tabs (`테마` and `일상`) asserted in a single `it`.
- No skipped tests (`it.skip`, `xit`, `.todo`). No `.only` calls. No flaky async gaps.

### New — production source (inspected only, no changes made)

`src/design-system/MoodPickerSheet.tsx` — 129 lines. `"use client"` directive on line 1.
All imports resolve to existing `@/design-system/*` and `@/lib/storage` modules.

---

## Commands Run

```
npm run typecheck   → PASS (exit 0, no output)
npm run lint        → PASS (no ESLint warnings or errors; next lint deprecation notice is cosmetic)
npm test            → PASS (191/191 tests, 29 files)
npm run build       → PASS (Next.js 15.5.18, 7 routes; compiled successfully)
```

---

## Results

| Command | Exit code | Result |
|---|---|---|
| `npm run typecheck` | 0 | PASS |
| `npm run lint` | 0 | PASS |
| `npm test` | 0 | PASS — 191/191 tests (29 files) |
| `npm run build` | 0 | PASS — 7 static/dynamic routes generated |

---

## Failures

None.

---

## Coverage Notes

- `MoodPickerSheet` unit surface is fully covered: open/close state wiring (via `BottomSheet`
  delegate), header rendering, all 10 mood cells, both close paths (`handleCancel` vs
  `handleSelect`), both `mode` branches, inactive-tab toast, selected-mood highlight, and the
  "use client" source guard.
- `BottomSheet`, `Toast`, `useToast`, and `MoodIcon` primitives are tested by their own existing
  suites; `MoodPickerSheet.test.tsx` treats them as black-box dependencies (correct).
- `formatSheetDate` output is validated indirectly through TC-2 (`'2026.05.17 일'`), which locks
  local-TZ dot-separated format and Korean single-char weekday.
- The `document.querySelectorAll` + `btn()` helper pattern is required because happy-dom excludes
  `<dialog>` content from the a11y tree when `showModal()` is mocked (native `open` attribute is
  never set). This matches the established pattern in `ConfirmDialog.test.tsx`.

---

## Remaining Risks

- **Line budget soft cap exceeded**: component is 129 lines, test file is 132 lines. Both exceed
  the 110-line cap stated in the technical design. CLAUDE.md notes the cap is a signal not an
  absolute; the extra lines are structural (JSDoc interface comments, happy-dom workaround helper)
  not padding. No action required before release.
- **`formatSheetDate` is private**: if REQ-009's editor needs the same format, promote to
  `src/lib/formatDate.ts` at that time.
- **Full editor flow E2E**: calendar to mood picker to body input is deferred to REQ-009's
  Playwright suite per the test plan.
- **CJS Vite deprecation warning**: cosmetic, affects all test runs in this project. Deferred.

---

## Verdict
PASS

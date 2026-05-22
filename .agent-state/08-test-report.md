# Test Report — REQ-010 (Fix Cycle 1 re-verify)

## Summary

All verification gates pass after Fix Cycle 1. 237/237 unit tests PASS. TypeCheck PASS.
Lint PASS. E2E: 4/4 PASS (calendar.spec.ts, editor.spec.ts, horizontal-date-picker.spec.ts E1
and E2 both green).

No existing test expected `router.back()` to be called on `onCancelInitial`. The
`onCancelInitial={undefined}` change in `Editor.tsx` caused zero unit-test regressions.

---

## Tests Added / Updated

| File | Cases | Status |
|---|---|---|
| `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` | 7 (H1–H7) | PASS |
| `src/app/diary/[date]/_components/__tests__/DateCell.test.tsx` | 8 (DC1–DC8) | PASS |
| `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx` | 4 (HP1–HP4) | PASS |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 15 total (3 new: C-strip-1,2,3) | PASS |
| `e2e/horizontal-date-picker.spec.ts` | 2 E2E (E1, E2) | PASS |

---

## Commands Run

```
npx vitest run --reporter=basic   → 35 files, 237 tests, all PASS (5.97s)
npx tsc --noEmit                  → 0 errors PASS
npm run lint                      → 0 warnings, 0 errors PASS
npm run test:e2e                  → 4 total: 4 passed (12.6s)
```

---

## Results

| Suite | Count | Result |
|---|---|---|
| Unit + integration (vitest) | 237 | PASS |
| TypeScript compile | — | PASS |
| ESLint | — | PASS |
| E2E — calendar.spec.ts | 1 | PASS |
| E2E — editor.spec.ts | 1 | PASS |
| E2E — horizontal-date-picker.spec.ts E1 | 1 | PASS |
| E2E — horizontal-date-picker.spec.ts E2 | 1 | PASS |

---

## Failures

None.

---

## onCancelInitial Regression Check

Inspected all 15 cases in `src/app/diary/[date]/__tests__/Editor.test.tsx`. No test asserted
that `router.back()` is called when MoodPickerSheet is canceled in `'initial'` mode.

- C1 verifies `showModal` is called (mood sheet auto-opens for new entry) — no cancel path tested.
- C8/C9 test the header back-button flow via `handleBack` / `handleSaveAndBack` — unrelated.
- No existing test is invalidated by the behavioral change. Zero regressions.

---

## Coverage Notes

- All 19 unit cases for new REQ-010 code (H1–H7, DC1–DC8, HP1–HP4) pass.
- 3 integration cases in Editor.test.tsx (C-strip-1, C-strip-2, C-strip-3) pass.
- E2E E1 verifies: date strip navigation preserves seeded entry A in localStorage and loads
  entry B text into the editor without changing the URL.
- E2E E2 verifies: closing MoodPickerSheet via "닫기" button stays on editor, then date-strip
  switch to date B does not persist a no-mood entry for date A.

---

## Remaining Risks

- `isoDate(offset)` in the E2E spec uses local-date arithmetic (`setDate`). In KST between
  midnight and 09:00 UTC, `isoDate(0)` returns today's local date correctly. Latent flakiness
  risk is low for developer machines but noted for CI in non-UTC zones.
- `EditorBody.tsx` at 122 lines and `Editor.tsx` at 192 lines remain over the 100-line soft
  ceiling. Extraction is recommended before the next feature adds further props.

---

## Verdict
PASS

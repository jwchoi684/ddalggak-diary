# Test Report

## Summary

REQ-013 (목록 화면 — List Screen) full suite is green. All 301 unit tests pass, TypeScript and ESLint are clean, and all 8 Playwright specs pass including the new `list.spec.ts`.

---

## Tests Added / Updated

### New unit test files (REQ-013)

| File | Cases |
|---|---|
| `src/lib/utils/__tests__/formatListDate.test.ts` | 4 (FLD1–FLD4) |
| `src/app/list/__tests__/ListScreen.test.tsx` | 12 (LS1–LS12) |

### Pre-existing unit tests (unchanged)

285 tests across 41 files — all continue to pass.

### New E2E file

| File | Cases |
|---|---|
| `e2e/list.spec.ts` | 1 (LE1) |

### Total unit count: 301 (285 pre-existing + 16 new)

---

## Commands Run

```
npx vitest run --reporter=basic    →  43 test files, 301/301 PASS  (9.96s)
npx tsc --noEmit                   →  clean (no output)
npm run lint                       →  no ESLint warnings or errors
npm run test:e2e                   →  8/8 PASS (24.8s)
```

---

## Results

### Vitest — per-file pass counts

| File | Tests |
|---|---|
| `src/lib/utils/__tests__/formatListDate.test.ts` | 4 |
| `src/app/list/__tests__/ListScreen.test.tsx` | 12 |
| `src/lib/storage/__tests__/photoBase64.test.ts` | 7 |
| `src/lib/hooks/__tests__/useSwipe.test.ts` | 7 |
| `src/lib/hooks/__tests__/useLongPress.test.ts` | 6 |
| `src/lib/hooks/__tests__/useEditorState.test.ts` | 8 |
| `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` | 7 |
| `src/lib/hooks/__tests__/usePhotoViewer.test.ts` | 4 |
| `src/lib/hooks/__tests__/useAutosave.test.ts` | 5 |
| `src/app/__tests__/CalendarDayCell.test.tsx` | 7 |
| `src/app/__tests__/CalendarScreen.test.tsx` | 8 |
| `src/app/__tests__/CalendarHeader.test.tsx` | 6 |
| `src/app/__tests__/CalendarGrid.test.tsx` | 5 |
| `src/app/__tests__/diary-date-page.test.tsx` | 4 |
| `src/app/__tests__/not-found.test.tsx` | 3 |
| `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` | 7 |
| `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` | 8 |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 21 |
| `src/app/diary/[date]/_components/__tests__/DateCell.test.tsx` | 8 |
| `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx` | 4 |
| `src/design-system/__tests__/useDialogControl.test.ts` | 7 |
| `src/design-system/__tests__/ConfirmDialog.test.tsx` | 8 |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | 10 |
| `src/design-system/__tests__/BottomSheet.test.tsx` | 6 |
| `src/design-system/__tests__/MoodIcon.test.tsx` | 9 |
| `src/design-system/__tests__/useToast.test.ts` | 5 |
| `src/design-system/__tests__/EmptyState.test.tsx` | 7 |
| `src/design-system/__tests__/IconButton.test.tsx` | 6 |
| `src/design-system/__tests__/FAB.test.tsx` | 5 |
| `src/design-system/__tests__/Card.test.tsx` | 5 |
| `src/design-system/__tests__/personas.test.ts` | 17 |
| `src/design-system/__tests__/moods.test.ts` | 12 |
| `src/design-system/__tests__/Toast.test.tsx` | 5 |
| `src/lib/storage/__tests__/diaries.test.ts` | 13 |
| `src/lib/storage/__tests__/conversations.test.ts` | 9 |
| `src/lib/storage/__tests__/useDiaries.test.ts` | 4 |
| `src/lib/storage/__tests__/settings.test.ts` | 8 |
| `src/lib/storage/__tests__/limits.test.ts` | 3 |
| `src/lib/storage/__tests__/uuid.test.ts` | 3 |
| `src/lib/storage/__tests__/ssr.test.ts` | 4 |
| `src/lib/storage/__tests__/no-direct-localstorage-access.test.ts` | 1 |
| `src/lib/navigation/__tests__/routes.test.ts` | 10 |
| `src/lib/navigation/__tests__/setupNextNavigation.test.ts` | 3 |
| **Total** | **301** |

### Playwright E2E — per-spec pass counts

| Spec | Tests | Result |
|---|---|---|
| `e2e/calendar.spec.ts` | 1 | PASS |
| `e2e/editor.spec.ts` | 1 | PASS |
| `e2e/horizontal-date-picker.spec.ts` | 2 | PASS |
| `e2e/list.spec.ts` | 1 | PASS |
| `e2e/photo-viewer.spec.ts` | 1 | PASS |
| `e2e/photos.spec.ts` | 2 | PASS |
| **Total** | **8** | **8/8 PASS** |

---

## Failures

None.

---

## Coverage Notes

- `formatListDate` — 4 cases cover same-year, prior-year, today, and yesterday formatting branches.
- `ListScreen` — 12 cases cover: empty-state render, entry count, sort order (newest first), mood emoji display, date formatting, body text truncation, tap-to-navigate, FAB presence and navigation, and header icon layout.
- E2E `list.spec.ts` (LE1) seeds 2 localStorage entries, navigates to `/list`, confirms both cards render, taps the first card, and asserts the URL transitions to `/diary/<date>`.
- All 285 pre-existing tests pass unchanged — no regression.

---

## Remaining Risks

1. Sort-toggle (if added in a future REQ) is not covered; current tests assume newest-first only.
2. E2E covers Chromium only; no Safari/Firefox run in CI.
3. Scroll preservation when returning from editor to list is not E2E-covered (unit-level only via ListScreen state tests).

---

## Verdict
PASS

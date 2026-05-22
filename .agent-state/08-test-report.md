# Test Report

## Summary

REQ-012 (사진 전체화면 뷰어) full suite is green. Two production-code defects were found and fixed during verification before all gates passed.

---

## Tests Added / Updated

### New unit test files

| File | Cases |
|---|---|
| `src/lib/hooks/__tests__/useSwipe.test.ts` | 7 (SW1–SW7) |
| `src/lib/hooks/__tests__/usePhotoViewer.test.ts` | 4 (PV1–PV4) |
| `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` | 7 (PVC1–PVC7) |

### Extended unit test files

| File | Cases added |
|---|---|
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | +2 (C-viewer-1, C-viewer-2) |

### New E2E file

| File | Cases |
|---|---|
| `e2e/photo-viewer.spec.ts` | 1 (PV-E1) |

### Total unit count: 285 (265 pre-existing + 20 new)

---

## Commands Run

```
npx vitest run --reporter=basic    →  41 test files, 285/285 PASS
npx tsc --noEmit                   →  clean (no output)
npm run lint                       →  no ESLint warnings or errors
npm run test:e2e                   →  7/7 PASS (20.4s)
```

---

## Results

### Vitest — per-file pass counts

| File | Tests |
|---|---|
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
| **Total** | **285** |

### Playwright E2E — per-spec pass counts

| Spec | Tests | Result |
|---|---|---|
| `e2e/calendar.spec.ts` | 1 | PASS |
| `e2e/editor.spec.ts` | 1 | PASS |
| `e2e/horizontal-date-picker.spec.ts` | 2 | PASS |
| `e2e/photo-viewer.spec.ts` | 1 | PASS |
| `e2e/photos.spec.ts` | 2 | PASS |
| **Total** | **7** | **7/7 PASS** |

---

## Failures

Two defects were found and fixed during verification.

### Defect 1 — inner content rendered unconditionally inside closed dialog

`PhotoViewer.tsx` originally rendered the inner content (`photo-viewer-container`, `photo-viewer-img`, close button) unconditionally inside the `<dialog>`. When the dialog is closed via `dialog.close()` the dialog element becomes `display:none`, but Playwright's `not.toBeVisible()` retries showed the `<img>` element still resolving as visible — the native dialog display:none was not sufficient for Playwright's visibility algorithm in this context.

Fix: wrapped the inner content in `{open && (...)}` so all child nodes are absent from the DOM when `open=false`.

File: `src/app/diary/[date]/_components/PhotoViewer.tsx`

### Defect 2 — setPointerCapture on swipe container blocked close button click

After defect 1 was fixed, the E2E still failed. Browser-side evaluation confirmed `dialog.close()` was never called — the button's `onClick` did not fire. Root cause: `useSwipe`'s `onPointerDown` calls `setPointerCapture` on the container div. When Playwright dispatches `pointerdown` on the close button it bubbles to the container, which captures the pointer. The subsequent `pointerup` is routed to the capturing container, not the button, so the browser-generated `click` event does not reach the button's React handler.

Fix: added `onPointerDown={(e) => e.stopPropagation()}` on the close button, preventing pointer events starting on the button from bubbling to the swipe container.

File: `src/app/diary/[date]/_components/PhotoViewer.tsx`

Both fixes are targeted and consistent with existing patterns (stopPropagation on interactive children inside gesture containers is the standard approach).

---

## Coverage Notes

- All 20 new unit cases cover the three new modules (useSwipe, usePhotoViewer, PhotoViewer) and the two Editor integration points.
- The 265 pre-existing tests are unaffected.
- E2E covers tap-to-open, viewer visible, close button, viewer dismissed end-to-end in Chromium.
- Swipe navigation (left/right) is covered by unit tests only; E2E swipe is acceptable per plan.

---

## Remaining Risks

1. `PhotoViewer.tsx` is 108 lines after both fixes — slightly over the 100-line soft limit. Acceptable per CLAUDE.md exception; the SVG and conditional are not candidates for extraction.
2. Vertical-swipe-to-close is not covered by E2E — unit-level only. Acceptable per original test plan.
3. No pinch-zoom E2E — explicitly deferred to v2 in REQ-012 Non-Goals.

---

## Verdict
PASS

# Frontend Implementation

## Summary

REQ-012 (사진 전체화면 뷰어) is implemented. Three new files were created and two existing files were modified. A full-screen `<dialog>`-based photo viewer is now wired into the diary editor, opened by short-tapping a PhotoCarousel thumbnail, with left/right swipe navigation and vertical swipe or ✕ button to close. All 285 unit tests pass. TypeScript type-check and lint are clean.

## Files Changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `src/lib/hooks/useSwipe.ts` | 82 | Pointer-event gesture hook with axis-lock, threshold, setPointerCapture try/catch |
| `src/lib/hooks/usePhotoViewer.ts` | 29 | Open/close/index state hook for photo viewer |
| `src/app/diary/[date]/_components/PhotoViewer.tsx` | 103 | Full-screen `<dialog>` viewer component |
| `src/lib/hooks/__tests__/useSwipe.test.ts` | 111 | 7 unit cases for useSwipe |
| `src/lib/hooks/__tests__/usePhotoViewer.test.ts` | 47 | 4 unit cases for usePhotoViewer |
| `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` | 113 | 7 unit cases for PhotoViewer component |
| `e2e/photo-viewer.spec.ts` | 56 | 1 E2E case for tap-to-view-to-close flow |

### Modified files

| File | Change | Lines (before → after) |
|---|---|---|
| `src/app/diary/[date]/_components/Editor.tsx` | Added imports for `PhotoViewer` and `usePhotoViewer`; added `usePhotoViewer` hook call; changed `onThumbnailTap={() => {}}` to `openViewer`; mounted `<PhotoViewer>` | 243 → 253 |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | Added 2 new test cases (C-viewer-1, C-viewer-2) | ~407 → ~447 |

### Unchanged files (as required)

- `src/app/diary/[date]/_components/PhotoCarousel.tsx` — NOT modified (96 lines, at budget limit)

## Behavior Added

1. **Thumbnail tap opens viewer**: `onThumbnailTap` in `PhotoCarousel` is now wired to `openViewer(id)` from `usePhotoViewer`. The initial index corresponds to the tapped photo's position in the array.

2. **Full-screen viewer**: `<PhotoViewer>` opens as a native `<dialog>` via `showModal()` on a pure-black background. The current photo is displayed `object-contain` centered.

3. **Left/right swipe navigation**: Swiping left advances to the next photo (capped at last); swiping right goes back (floored at 0). Axis-lock prevents diagonal double-fires.

4. **Vertical swipe and ✕ button to close**: Both call `onClose` → `closeViewer()` which flips `viewerOpen` to false, causing `useDialogControl` to call `close()` on the dialog.

5. **Counter display**: `"N / M"` format (e.g., `"2 / 5"`) shown top-right, no Korean suffix.

6. **ESC key close**: Handled automatically by `useDialogControl` via the native `cancel` event.

7. **Empty photos guard**: When `photos.length === 0`, an empty closed `<dialog>` is rendered with ref attached — no crash, no visible content.

8. **Index reset on each open**: `useEffect([open, initialIndex])` clamps `currentIndex` to `[0, photos.length - 1]` whenever the viewer opens.

## Existing Patterns Reused

| Pattern | Source |
|---|---|
| `useDialogControl(open, onClose)` | `src/design-system/useDialogControl.ts` |
| Pointer-event handler object shape (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) | `src/lib/hooks/useLongPress.ts` |
| `showModal`/`close` prototype mock in `beforeEach`/`afterEach` | `Editor.test.tsx`, `MoodPickerSheet.test.tsx` |
| `makePointerEvent(type, overrides)` helper pattern | `useLongPress.test.ts` |
| `fireEvent.pointer*` sequence for gesture simulation | `PhotoCarousel.test.tsx` |
| `makePhoto()` fixture | `src/lib/storage/__tests__/fixtures.ts` |
| `makeDiary()` fixture | `src/lib/storage/__tests__/fixtures.ts` |
| `eslint-disable-next-line @next/next/no-img-element` for base64 dataUrl | `PhotoCarousel.tsx` line 52 |
| `seedDiariesScript` helper | `e2e/_helpers/seedDiaries.ts` |
| `aria-label="닫기"` + 44×44 touch target | Design token convention |

## Tests Added / Updated

### New test files

- `src/lib/hooks/__tests__/useSwipe.test.ts` — 7 cases (SW1-SW7): left/right/vertical swipe, sub-threshold no-op, axis-lock, pointercancel reset
- `src/lib/hooks/__tests__/usePhotoViewer.test.ts` — 4 cases (PV1-PV4): initial state, openViewer by id, unknown-id fallback, closeViewer
- `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` — 7 cases (PVC1-PVC7): open=false guard, initial index + counter, close button, left swipe, right swipe boundary, swipe left+right, vertical swipe close

### Extended test files

- `src/app/diary/[date]/__tests__/Editor.test.tsx` — +2 cases (C-viewer-1, C-viewer-2): thumbnail tap opens viewer (showModal call count +1), close button triggers dialog close

### E2E

- `e2e/photo-viewer.spec.ts` — 1 case (PV-E1): seed with 2 photos, navigate to editor, tap thumbnail, assert viewer visible, click 닫기, assert viewer dismissed

## Commands Run

```
npx tsc --noEmit          → clean (no output)
npm run lint              → No ESLint warnings or errors
npx vitest run --reporter=basic → 41 test files, 285 tests passed
```

Test count breakdown:
- Pre-existing: 265 tests
- New (useSwipe): 7
- New (usePhotoViewer): 4
- New (PhotoViewer component): 7
- New (Editor extension): 2
- Total new: 20
- Total: 285

## Risks / Follow-ups

1. **PhotoViewer.tsx at 103 lines** — slightly over the 100-line soft limit. The extra 3 lines come from the inline SVG close icon (multi-attribute `<line>` elements). The component has a single responsibility and splitting the SVG icon is not warranted. Acceptable per the CLAUDE.md exception for cases where splitting is unnatural.

2. **`onDialogClick` intentionally omitted** — per architecture specification, the `onDialogClick` handler from `useDialogControl` is NOT spread on `<dialog>`. Swipe events ending on the black backdrop will not trigger accidental close. This is a deliberate deviation from the pattern in `ConfirmDialog` and `BottomSheet`.

3. **E2E test not run** — per instructions, Playwright E2E (Phase 10) is owned by a later phase. The `e2e/photo-viewer.spec.ts` file is written and ready.

4. **`useEffect` dep array uses `photos.length`** — instead of the full `photos` array, to avoid unnecessary re-runs when the array reference changes but length does not. This is correct; the clamp only needs the length to bound the index.

## Verdict
PASS

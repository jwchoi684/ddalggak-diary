# Test Plan

## Summary

REQ-012 adds a full-screen photo viewer modal to the diary editor. Three new units require test coverage: the `useSwipe` gesture hook, the `usePhotoViewer` state-management hook, and the `<PhotoViewer>` dialog component. Two additional cases extend the existing `Editor.test.tsx`. One optional E2E case covers the end-to-end tap-to-view-to-close flow. Total new cases: 22 (21 unit + 1 E2E).

All unit tests use Vitest 2 with `// @vitest-environment happy-dom`. Pointer-event gesture tests follow the same `renderHook` + `makePointerEvent` pattern established in `useLongPress.test.ts`. Dialog tests follow the `showModal`/`close` prototype-mock pattern established in `MoodPickerSheet.test.tsx` and `Editor.test.tsx`.

---

## Unit Tests

### File 1 — `src/lib/hooks/__tests__/useSwipe.test.ts` (7 cases)

Uses `renderHook` from `@testing-library/react`. Pointer events dispatched via a helper `makePointerEvent(type, overrides)` that mirrors the pattern in `useLongPress.test.ts`. No timers needed.

| ID | Description | Assertion |
|----|-------------|-----------|
| SW1 | dx < -50 fires `onSwipeLeft` | pointerDown(x=0) → pointerMove(dx=-6 to lock x) → pointerMove(x=-51) → pointerUp → `onSwipeLeft` called once; others not called |
| SW2 | dx > +50 fires `onSwipeRight` | pointerDown(x=0) → pointerMove(x=51) → pointerUp → `onSwipeRight` called once |
| SW3 | dy > +50 fires `onSwipeVertical` | pointerDown(y=0) → pointerMove(y=51) → pointerUp → `onSwipeVertical` called once |
| SW4 | dy < -50 fires `onSwipeVertical` | pointerDown(y=0) → pointerMove(y=-51) → pointerUp → `onSwipeVertical` called once |
| SW5 | sub-threshold `|dx|=30` → no callback | pointerDown → pointerMove(x=-30) → pointerUp → all three callbacks untouched |
| SW6 | axis-lock — x locks first; subsequent large y ignored | pointerDown → pointerMove(dx=6, dy=2) locks x → pointerMove(dy=200) → pointerUp with dx=-60 → `onSwipeLeft` fires; `onSwipeVertical` not called |
| SW7 | `pointercancel` resets; next gesture works normally | pointerDown → pointerCancel → no callback; then fresh pointerDown → pointerMove(dx=-60) → pointerUp → `onSwipeLeft` fires |

Implementation note: `renderHook` returns `result.current` containing `{onPointerDown, onPointerMove, onPointerUp, onPointerCancel}`. Events are passed as `fakeEvent as unknown as React.PointerEvent`. Wrap each handler call in `act()`.

---

### File 2 — `src/lib/hooks/__tests__/usePhotoViewer.test.ts` (4 cases)

Uses `renderHook` and `act`. No DOM needed; node environment sufficient but happy-dom is fine for consistency.

| ID | Description | Assertion |
|----|-------------|-----------|
| PV1 | Initial state is closed at index 0 | `viewerOpen === false`, `viewerInitialIndex === 0` |
| PV2 | `openViewer(id)` finds correct index | 3-photo array, call `openViewer(photos[1].id)` → `viewerOpen === true`, `viewerInitialIndex === 1` |
| PV3 | `openViewer(unknownId)` falls back to 0 | call `openViewer('no-such-id')` → `viewerInitialIndex === 0`, `viewerOpen === true` |
| PV4 | `closeViewer()` flips open to false | open then close → `viewerOpen === false` |

---

### File 3 — `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` (7 cases)

Environment: `// @vitest-environment happy-dom`. Mock `HTMLDialogElement.prototype.showModal` and `.close` in `beforeEach`/`afterEach` (identical boilerplate to `Editor.test.tsx`). Import `makePhoto` from `@/lib/storage/__tests__/fixtures`. Import `PhotoViewer` from `@/app/diary/[date]/_components/PhotoViewer`.

Local helper:
```ts
function swipe(el: Element, axis: 'x' | 'y', delta: number) {
  fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(el, {
    clientX: axis === 'x' ? delta : 0,
    clientY: axis === 'y' ? delta : 0,
    pointerId: 1,
  });
  fireEvent.pointerUp(el, {
    clientX: axis === 'x' ? delta : 0,
    clientY: axis === 'y' ? delta : 0,
    pointerId: 1,
  });
}
```

| ID | Description | Assertion |
|----|-------------|-----------|
| PVC1 | `open=false` → `showModal` never called | render `<PhotoViewer open={false} ...>` → `showModalMock` call count 0 |
| PVC2 | `open=true, initialIndex=1`, 3 photos → correct image and counter | `data-testid="photo-viewer-img"` src equals `photos[1].dataUrl`; `data-testid="photo-viewer-counter"` text is `"2 / 3"` |
| PVC3 | Close button click calls `onClose` | find button with `aria-label="닫기"`, `fireEvent.click` → `onClose` spy called once |
| PVC4 | Left swipe advances to next photo | open at index 0, swipe x=-60 on inner container → `data-testid="photo-viewer-img"` src becomes `photos[1].dataUrl` |
| PVC5 | Right swipe at index 0 stays at 0 | swipe x=+60 at index 0 → image src unchanged (`photos[0].dataUrl`) |
| PVC6 | Swipe left then right returns to first photo | open at index 0, swipe left → index 1, swipe right → image src back to `photos[0].dataUrl` |
| PVC7 | Vertical swipe calls `onClose` | swipe y=+60 on inner container → `onClose` spy called once |

Query strategy: because happy-dom does not expose `<dialog>` in the a11y tree without the `open` attribute, use `document.querySelector('[data-testid="photo-viewer-img"]')` and `document.querySelector('[data-testid="photo-viewer-counter"]')` directly — same pattern as `PhotoCarousel.test.tsx`. Swipe events are dispatched on the inner container `<div>` identified by `data-testid="photo-viewer-container"` (implementor must guarantee this testid).

---

### File 4 — `src/app/diary/[date]/__tests__/Editor.test.tsx` (extend +2 cases)

Add to the existing `describe` block. Reuses `renderEditor`, `makePhoto`, `readDiariesMock`, `showModalMock`, and `closeMock` already in scope.

| ID | Description | Assertion |
|----|-------------|-----------|
| C-viewer-1 | Short-tap thumbnail → `showModal` called for PhotoViewer | seed diary with 1 photo via `readDiariesMock.mockReturnValue([makeDiary({ photos: [makePhoto()] })])`; `renderEditor`; capture `showModalMock.mock.calls.length` after load; locate `data-testid="photo-thumb-{id}"`; fireEvent.pointerDown then pointerUp (< 500ms); assert call count increased by 1 |
| C-viewer-2 | Click viewer close button → `closeMock` called | from C-viewer-1 state; find `aria-label="닫기"`; `fireEvent.click`; assert `closeMock` called |

Note: `showModal` is called once for `MoodPickerSheet` on initial editor load. Snapshot the count after `renderEditor` completes and assert `+1` after the thumbnail tap to avoid coupling to MoodPickerSheet behavior.

---

## Integration Tests

Not applicable. PhotoViewer is display-only with no storage writes. All storage integration is covered by existing tests.

---

## E2E Tests

### File — `e2e/photo-viewer.spec.ts` (1 case, recommended)

| ID | Description |
|----|-------------|
| PV-E1 | Seed entry with 2 photos → navigate to editor → tap thumbnail → assert viewer image visible → click `닫기` → viewer dismissed |

Implementation:
- Construct the diary entry inline with two photo objects (`id`, `dataUrl`, `width`, `height`, `addedAt`) — do not import fixtures (unavailable in browser context).
- `await page.addInitScript(seedDiariesScript([entry]))` before `page.goto('/diary/2026-05-01')`.
- Assert `page.getByTestId('photo-viewer-img')` is not visible before tap.
- Click `page.getByTestId('photo-thumb-{photos[0].id}')`.
- Assert `page.getByTestId('photo-viewer-img')` is visible.
- Click `page.getByRole('button', { name: '닫기' })`.
- Assert `page.getByTestId('photo-viewer-img')` is not visible.

---

## Regression Tests

Existing 265 unit tests must pass without modification:

- All 15 `Editor.test.tsx` cases remain green — `<PhotoViewer open={false}>` must not call `showModal`.
- All 8 `PhotoCarousel.test.tsx` cases remain green — `PhotoCarousel.tsx` is not modified.
- `useDialogControl.test.ts` 6 cases unaffected.

---

## Security-Relevant Tests

Not applicable. `dataUrl` strings are already stored in localStorage and never sent to any endpoint. No new XSS surface: images rendered via `<img src={dataUrl}>`, identical to `PhotoCarousel`.

---

## Fixtures / Mocks Needed

| Mock / Fixture | Location | Notes |
|---|---|---|
| `makePhoto()` | `src/lib/storage/__tests__/fixtures.ts` | Already exists; reuse directly |
| `HTMLDialogElement.prototype.showModal` | Per-file `beforeEach` | Same pattern as `Editor.test.tsx` and `MoodPickerSheet.test.tsx` |
| `HTMLDialogElement.prototype.close` | Restored in `afterEach` | Same pattern |
| `makePointerEvent(type, overrides)` | Local helper in `useSwipe.test.ts` | Mirrors `useLongPress.test.ts` |
| `swipe(el, axis, delta)` | Local helper in `PhotoViewer.test.tsx` | Dispatches pointerDown/Move/Up sequence |
| Inline photo objects | `e2e/photo-viewer.spec.ts` | `{id, dataUrl, width, height, addedAt}` constructed inline |

---

## Commands to Run

```bash
# Full unit suite (existing 265 + new 21 = ~286)
npx vitest run

# Targeted runs during development
npx vitest run src/lib/hooks/__tests__/useSwipe.test.ts
npx vitest run src/lib/hooks/__tests__/usePhotoViewer.test.ts
npx vitest run "src/app/diary/\[date\]/__tests__/PhotoViewer.test.tsx"
npx vitest run "src/app/diary/\[date\]/__tests__/Editor.test.tsx"

# Type-check
npx tsc --noEmit

# E2E (requires dev server on port 3000)
npx playwright test e2e/photo-viewer.spec.ts
```

---

## Not Applicable Tests

- **Pinch-zoom**: explicitly v2 per REQ-012 Non-Goals.
- **Photo sharing**: explicitly v2.
- **Backend / API endpoints**: none introduced.
- **Database / new storage keys**: none introduced.
- **Auth / security flows**: none introduced.
- **Performance profiling**: viewer is a string-swap on an in-memory base64 value; no fetch, no allocation boundary to test.

---

## Verdict
PASS

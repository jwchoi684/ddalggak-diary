# Technical Design — REQ-012: 사진 전체화면 뷰어

## Summary

REQ-012 adds a full-screen photo viewer modal to the diary editor. When a user short-taps a `PhotoCarousel` thumbnail, a `<dialog>`-based full-screen viewer opens over the editor on a pure-black background. The viewer supports left/right pointer swipe to navigate photos, vertical swipe or ✕ button (or ESC) to close. No backend, database, or routing changes are required. The feature is entirely display-only and zero-impact on autosave.

---

## Implementation Strategy

Three new files; one file edited.

1. `src/lib/hooks/useSwipe.ts` — gesture hook (no React component, pure pointer-event logic).
2. `src/lib/hooks/usePhotoViewer.ts` — state-management hook for open/close/index.
3. `src/app/diary/[date]/_components/PhotoViewer.tsx` — `<dialog>`-based full-screen viewer component.
4. `src/app/diary/[date]/_components/Editor.tsx` — wire `onThumbnailTap` and mount `<PhotoViewer>`.

---

## Component / File Map

```
src/
  lib/hooks/
    useSwipe.ts                             # new — gesture hook
    usePhotoViewer.ts                       # new — viewer open/close/index state
  app/diary/[date]/
    _components/
      PhotoViewer.tsx                       # new — full-screen <dialog> viewer
      Editor.tsx                            # edited — wire hook + mount viewer
    __tests__/
      PhotoViewer.test.tsx                  # new — 7 unit cases
  lib/hooks/
    __tests__/
      useSwipe.test.ts                      # new — 7 unit cases
      usePhotoViewer.test.ts                # new — 4 unit cases
```

---

## Exact Function Signatures

### `useSwipe.ts`

```ts
export interface SwipeOptions {
  onSwipeLeft: () => void;     // dx < -threshold and axis locked to x
  onSwipeRight: () => void;    // dx > +threshold and axis locked to x
  onSwipeVertical: () => void; // |dy| > threshold and axis locked to y
  threshold?: number;          // default 50 (px displacement)
  slopPx?: number;             // default 5 (px before axis is locked)
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export function useSwipe(options: SwipeOptions): SwipeHandlers
```

Internal mechanics (refs, not state — no re-render during drag):
- `startX`, `startY` — coordinates at `pointerdown`.
- `lockedAxis: 'x' | 'y' | null` — set once the first `pointermove` exceeds `slopPx` on either axis; the larger delta wins; never changes after lock.
- `active: boolean` — true from `pointerdown` until `pointerup` / `pointercancel`.
- On `pointerdown`: capture via `e.currentTarget.setPointerCapture(e.pointerId)` (wrap in try/catch for happy-dom); record `startX`/`startY`; reset `lockedAxis` and `active=true`.
- On `pointermove`: if not active, return. If `lockedAxis` is null and displacement exceeds `slopPx`, lock to axis with larger absolute delta. No callback fired on move — callbacks fire only on `pointerup`.
- On `pointerup`: if not active, return. Set `active=false`. If axis locked to `'x'`: fire `onSwipeLeft` if dx < -threshold, `onSwipeRight` if dx > +threshold. If axis locked to `'y'`: fire `onSwipeVertical` if |dy| > threshold. Pointer capture auto-releases on pointerup.
- On `pointercancel`: set `active=false`, reset `lockedAxis`. No callback.
- All handlers stable via `useCallback`. Options wrapped in a ref so callbacks are never stale without needing to be in dep arrays.

### `usePhotoViewer.ts`

```ts
export function usePhotoViewer(photos: Photo[]): {
  viewerOpen: boolean;
  viewerInitialIndex: number;
  openViewer: (id: string) => void;
  closeViewer: () => void;
}
```

- `const [viewerOpen, setViewerOpen] = useState(false)`
- `const [viewerInitialIndex, setViewerInitialIndex] = useState(0)`
- `openViewer(id)`: `const idx = photos.findIndex(p => p.id === id); setViewerInitialIndex(idx >= 0 ? idx : 0); setViewerOpen(true)`. Wrapped in `useCallback([photos])`.
- `closeViewer()`: `setViewerOpen(false)`. Wrapped in `useCallback([])`.

### `PhotoViewer.tsx`

```ts
export interface PhotoViewerProps {
  photos: Photo[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewer({ photos, open, initialIndex, onClose }: PhotoViewerProps): React.ReactElement
```

- Internal: `const [currentIndex, setCurrentIndex] = useState(initialIndex)`.
- Reset on each open:
  ```ts
  useEffect(() => {
    if (open) setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
  }, [open, initialIndex]);
  ```
- Dialog control: `const { ref } = useDialogControl(open, onClose)`. `onDialogClick` is intentionally NOT spread onto `<dialog>` (per architecture risk #1).
- Empty photos: if `photos.length === 0`, render `<dialog ref={ref} className="..." />` (empty closed dialog) so the ref is still attached but no content is shown.
- Swipe callbacks (stable via `useCallback`):
  - `onSwipeLeft`: `setCurrentIndex(i => Math.min(i + 1, photos.length - 1))`
  - `onSwipeRight`: `setCurrentIndex(i => Math.max(i - 1, 0))`
  - `onSwipeVertical`: `onClose`
- Spread `useSwipe({ onSwipeLeft, onSwipeRight, onSwipeVertical })` onto the inner container `<div>`, NOT on `<dialog>`.

---

## Editor.tsx Integration Delta

```diff
+ import { usePhotoViewer } from '@/lib/hooks/usePhotoViewer';
+ import { PhotoViewer } from './PhotoViewer';

  export function Editor({ date }: EditorProps) {
    ...
+   const { viewerOpen, viewerInitialIndex, openViewer, closeViewer } =
+     usePhotoViewer(state.photos);
    ...
    <PhotoCarousel
      photos={state.photos}
      onDelete={(id) => dispatch({ type: 'DELETE_PHOTO', id })}
-     onThumbnailTap={() => {}}
+     onThumbnailTap={openViewer}
    />
    ...
+   <PhotoViewer
+     photos={state.photos}
+     open={viewerOpen}
+     initialIndex={viewerInitialIndex}
+     onClose={closeViewer}
+   />
```

`<PhotoViewer>` is mounted always — `useDialogControl` drives `showModal`/`close` internally based on the `open` prop. Placement: after `<PhotoCarousel>`, before `<Toast>`.

---

## Visual Spec

| Element | Tailwind / style |
|---|---|
| `<dialog>` | `p-0 m-0 border-none bg-transparent max-w-none max-h-none w-full h-full` — reset all browser dialog defaults |
| Container `<div>` | `w-full h-[100dvh] bg-black flex flex-col` |
| Close `<button>` | `absolute top-4 left-4 w-[44px] h-[44px] flex items-center justify-center text-white` |
| Counter `<span>` | `absolute top-4 right-4 text-sm text-white` |
| Image `<img>` | `flex-1 w-full object-contain` |

---

## Accessibility Spec

- `<dialog>` has implicit `role="dialog"` from the HTML element — no extra `role` attribute.
- Close `<button>`: `aria-label="닫기"` + `data-testid="photo-viewer-close"`. First focusable element in DOM so `showModal()` auto-focus lands here.
- Image: `<img alt="사진 {currentIndex + 1}" data-testid="photo-viewer-img">`.
- Counter: `<span data-testid="photo-viewer-counter" aria-live="polite">`. Content `"2 / 5"` (no Korean suffix).
- ESC key close: handled automatically by `useDialogControl` via the `cancel` event listener.
- Body scroll lock: automatic via `showModal()` top-layer.

---

## Edge Case Resolutions

1. **PhotoViewer props exact shape** — `{photos, open, initialIndex, onClose}`. Internal `currentIndex` state initialized from `initialIndex` via useEffect on each open.
2. **useSwipe API** — `{onSwipeLeft, onSwipeRight, onSwipeVertical, threshold?=50, slopPx?=5}` returning `{onPointerDown, onPointerMove, onPointerUp, onPointerCancel}`.
3. **usePhotoViewer API** — `{viewerOpen, viewerInitialIndex, openViewer(id), closeViewer()}`. Falls back to index 0 on unknown id.
4. **Reset currentIndex on open** — `useEffect([open, initialIndex])` clamps and resets.
5. **Boundary behavior** — left swipe (next) `Math.min(i+1, photos.length-1)`; right swipe (prev) `Math.max(i-1, 0)`; vertical swipe calls `onClose`.
6. **Empty photos defensive** — `photos.length === 0` renders empty dialog node (ref attached, no content). In practice never reached because PhotoCarousel returns null when empty.
7. **Test selectors** — `data-testid="photo-viewer-close"`, `data-testid="photo-viewer-img"`, `data-testid="photo-viewer-counter"`.
8. **Pointer capture release** — auto-released on pointerup; no explicit `releasePointerCapture` call. Wrap `setPointerCapture` in try/catch for happy-dom.
9. **Editor.tsx regression** — existing 15 tests unaffected because `<PhotoViewer open={false}>` will not trigger `showModal` calls in `useDialogControl`.
10. **Single-photo case** — swipe handlers attached but bounded clamps prevent any change.

---

## Test Hooks

| Element | Locator |
|---|---|
| Dialog | implicit `role="dialog"` from `<dialog>` |
| Close button | `aria-label="닫기"` or `data-testid="photo-viewer-close"` |
| Image | `data-testid="photo-viewer-img"` |
| Counter | `data-testid="photo-viewer-counter"` |

Unit test matrix:

**`useSwipe.test.ts` (7 cases)**:
1. Left swipe (dx<-50) → onSwipeLeft
2. Right swipe (dx>+50) → onSwipeRight
3. Vertical down (dy>+50) → onSwipeVertical
4. Vertical up (dy<-50) → onSwipeVertical
5. Sub-threshold (|dx|=30) → no callback
6. Axis-lock — x locked first, subsequent y movement ignored
7. pointercancel resets state cleanly

**`usePhotoViewer.test.ts` (4 cases)**:
1. Initial closed state
2. openViewer with matching id sets correct index
3. openViewer with unknown id falls back to 0
4. closeViewer flips state

**`PhotoViewer.test.tsx` (7 cases)** — same showModal mock pattern:
1. open=false, showModal not called
2. open=true initialIndex=1, image src is photos[1].dataUrl
3. Counter "2 / 3"
4. Close button click calls onClose
5. Swipe left advances index, image src updates
6. Swipe right at index 0 stays at 0
7. Vertical swipe calls onClose

**`Editor.test.tsx` extension (2 cases)**:
8. Tap thumbnail → showModal called
9. Click close → close mock called

**E2E (optional, 1 case)**: tap thumbnail → viewer visible → click ✕ → editor visible.

---

## File Budget

| File | Status | Target lines |
|---|---|---|
| `src/lib/hooks/useSwipe.ts` | NEW | ~50 |
| `src/lib/hooks/usePhotoViewer.ts` | NEW | ~25 |
| `src/app/diary/[date]/_components/PhotoViewer.tsx` | NEW | ~80 |
| `src/lib/hooks/__tests__/useSwipe.test.ts` | NEW | ~80 |
| `src/lib/hooks/__tests__/usePhotoViewer.test.ts` | NEW | ~40 |
| `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` | NEW | ~120 |
| `src/app/diary/[date]/_components/Editor.tsx` | MODIFY | ~255 (was 243; pre-accepted) |

`PhotoCarousel.tsx` MUST NOT be modified (already at 96-line budget limit).

---

## Implementation Order

1. `useSwipe.ts` + tests
2. `usePhotoViewer.ts` + tests
3. `PhotoViewer.tsx` + tests
4. `Editor.tsx` integration + 2 new test cases
5. Run full unit suite (must be 265 + new cases)
6. Optional E2E

---

## Backward Compatibility

- `onThumbnailTap` is already `(id: string) => void` and stubbed `() => {}` in `Editor.tsx`. Changing to `openViewer` is a no-op from the carousel's perspective.
- `useDialogControl` API unchanged.
- `<PhotoCarousel>` unchanged.
- All existing Editor behavior unchanged.

---

## Performance Considerations

- All pointer-event state uses `useRef` (no re-renders during drag).
- `photos` prop is the same `state.photos` reference — no extra allocation.
- Images already in memory as base64 dataUrl strings — switching is a string swap, no fetch.
- `useEffect` for index reset runs only when `open` or `initialIndex` changes.

---

## Infra Considerations

None. Client-only component. `"use client"` directive needed on `PhotoViewer.tsx`.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|---|---|
| `onDialogClick` omission: swipe ending on black backdrop could call `onClose` if `onDialogClick` is accidentally spread | Design explicitly omits `onDialogClick`. Code review checklist. |
| `dialog::backdrop` visible during animation | Inner `<div bg-black>` masks backdrop. Harmless. |
| `PhotoCarousel.tsx` at 96 lines | Zero lines added to this file. |
| Diagonal swipe dual-fires | Axis-lock at first move exceeding slopPx; test case #6. |
| `Editor.tsx` grows to ~255 | Accepted for coordinator file. `usePhotoViewer` extraction limits growth. |
| `setPointerCapture` may throw in happy-dom | Wrap in try/catch in `useSwipe`. |

---

## Open Questions

All resolved by pre-decisions. None remain.

---

## Verdict
PASS

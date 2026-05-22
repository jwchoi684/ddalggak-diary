# Architecture Report — REQ-012

## Summary

REQ-012 adds a full-screen photo viewer modal over the diary editor. The viewer opens when a carousel thumbnail is short-tapped, supports left/right pointer swipe for navigation, supports vertical swipe or ESC/✕ to close, and is display-only with zero impact on autosave. All major integration points are well-understood: the hook, dialog, carousel, and editor patterns are mature and self-consistent.

---

## Frontend Findings

### 1. `useDialogControl` — exact API

Signature (confirmed, `src/design-system/useDialogControl.ts` line 28):

```ts
export function useDialogControl(
  open: boolean,
  onClose: () => void,
): DialogControlResult   // { ref, onDialogClick }
```

- The old three-argument `(ref, open, onClose)` form does NOT exist. The hook creates its own `ref` internally and returns it.
- ESC is handled via a `cancel` event listener attached when `open` becomes `true` and removed when `open` becomes `false` (cycle-2 fix confirmed at lines 46-51). No stale closure risk — `onCloseRef` is kept current.
- `showModal()` places the dialog in the native top-layer, which automatically suppresses body scroll. No `overflow: hidden` on `<body>` is needed or present.
- Backdrop click detection: `e.target === ref.current` on `onDialogClick`. The `PhotoViewer` implementation must NOT spread `onDialogClick` onto its dialog, because a swipe that ends on the dialog backdrop would inadvertently close the viewer (false backdrop click). The viewer should close only via ✕ button, vertical swipe, or ESC — skip `onDialogClick`.

### 2. Existing dialog usage patterns

All three existing dialog consumers follow the same pattern: call `useDialogControl(open, onClose)`, spread `ref` on `<dialog>`, spread `onDialogClick` on `<dialog onClick>`. There is no full-screen variant in the codebase.

- `BottomSheet`: slides from bottom, translucent backdrop via `globals.css dialog::backdrop`. The backdrop rule (`rgba(0,0,0,0.4)`) will apply to `PhotoViewer` too by default. Since the viewer's background is a full `#000` fill inside the dialog (not relying on backdrop), this is harmless.
- `ConfirmDialog`: centered overlay, uses `onDialogClick` for backdrop dismiss — a pattern the viewer will intentionally skip.

### 3. `PhotoCarousel.tsx` — `onThumbnailTap` and NB-4 fix

`onThumbnailTap?: (id: string) => void` at line 8 of `src/app/diary/[date]/_components/PhotoCarousel.tsx`. Currently wired as `() => {}` in `Editor.tsx` line 191 (signature mismatch: the prop accepts `(id: string)` but the stub ignores `id`; REQ-012 must fix this to `(id) => openViewer(id)`).

NB-4 fix is present. `didCancel` ref is set on any `pointerMove`, and `onPointerUp` at lines 58-60 gates `onShortTap` behind `!didLong.current && !didCancel.current`. Both flags reset to `false` on every `onPointerDown`. Short tap fires correctly only on a clean press-release cycle with no move or long-press.

### 4. `Editor.tsx` — size and state extraction

Current size: **243 lines**. The JSX return alone is 88 lines (lines 155-243). Adding two state variables (`viewerOpen: boolean`, `viewerInitialIndex: number`) plus a `handleThumbnailTap` function inline would push to approximately 255 lines — past the soft 100-line-per-responsibility rule but not catastrophically over.

However, extracting a `usePhotoViewer` hook is the cleaner path:

```ts
// src/lib/hooks/usePhotoViewer.ts  (~25 lines)
export function usePhotoViewer(photos: Photo[]) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  function openViewer(id: string) { ... }
  function closeViewer() { setViewerOpen(false); }
  return { viewerOpen, viewerInitialIndex, openViewer, closeViewer };
}
```

This keeps `Editor.tsx` at ~250 lines (just adds a hook call and two JSX props), and the hook is independently testable. Do not add `usePhotoViewer` to the design-system folder — it is diary-scoped, belongs at `src/lib/hooks/usePhotoViewer.ts`.

### 5. `useLongPress.ts` — pattern for `useSwipe.ts`

`useLongPress` at `src/lib/hooks/useLongPress.ts` (45 lines) returns a plain object of named pointer-event handlers: `{ onPointerDown, onPointerUp, onPointerMove, onPointerCancel, onPointerLeave }`. This is the exact interface pattern to replicate in `useSwipe.ts`.

Key internal mechanics to mirror:
- `startX` / `startY` in `useRef` (not state, no re-render on drag).
- `useEffect` cleanup to prevent stale timers (for swipe, cancel any locked-axis state).
- `useCallback` on each handler with stable deps.

`useSwipe.ts` additionally needs: axis-lock on first move exceeding 5 px slop, horizontal callback `(direction: 'left'|'right') => void`, vertical callback `() => void`, and `threshold` param (default 50 px per REQ-012 intake Q2).

### 6. `useSwipe.ts` — confirmed absent

`find src/lib/hooks` shows only `useAutosave`, `useEditorState`, `useHorizontalDatePicker`, `useLongPress`. `useSwipe.ts` does not exist. New file needed at `src/lib/hooks/useSwipe.ts`.

### 7. Z-index / top-layer conflicts

The app uses `showModal()` for all dialogs. `showModal()` promotes each `<dialog>` to the browser's native top-layer, which stacks above all CSS z-index. Multiple `showModal()` dialogs stack in paint order (last shown is on top). In practice, only one dialog should be open at a time in the editor. The `PhotoViewer` dialog will be on top of any other editor dialogs because the viewer is opened after the editor has loaded. No z-index conflicts anticipated.

The `dialog::backdrop` in `globals.css` (line 50) is `rgba(0,0,0,0.4)`. For `PhotoViewer` the inner content fills the full viewport in black, so the backdrop is visually irrelevant but harmless.

### 8. Tailwind v4 utilities

- `bg-black` — Tailwind v4 retains default black (`#000`); utility is available.
- `h-[100dvh]` — arbitrary value syntax is valid; `min-h-dvh` is already used in `layout.tsx` confirming dvh support.
- `object-contain` — standard Tailwind utility, confirmed available.
- `w-screen` / `h-screen` can be replaced with `w-full h-[100dvh]` inside the dialog to keep mobile chrome-safe sizing.

### 9. SVG close icon location

No dedicated icon file exists. All icons in this codebase are inline SVG literals. The `CloseIcon` JSX is defined inline in `MoodPickerSheet.tsx` (lines 20-26). The `PhotoViewer` close button should define its own inline `✕` SVG or reuse the same SVG nodes directly — since `IconButton` is in the design system, use `IconButton` with an inline SVG icon prop. The `IconButton` background is `bg-paper` (white circle) by default; for the black-background viewer the close button needs a white icon on transparent or semi-transparent dark background. `IconButton` accepts `className` for overrides — use `className="!bg-transparent"` or a custom style.

Alternatively, render a plain `<button>` styled to 44×44 with white text/icon. The design-system rule says to search first — `IconButton` is reusable but its white-circle style does not fit a full-black viewer well without override. A plain accessible `<button>` with `aria-label="닫기"` and `style={{ width: 44, height: 44 }}` is acceptable here given the contrast inversion.

### 10. Test setup for `<dialog>` in happy-dom

The established pattern (confirmed in `useDialogControl.test.ts`, `Editor.test.tsx`, `diary-date-page.test.tsx`) is:

```ts
beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
});
afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  cleanup();
});
```

This pattern must be applied in `PhotoViewer.test.tsx`. Pointer-event simulation for swipe tests uses `fireEvent.pointerDown/pointerMove/pointerUp` (matching `PhotoCarousel.test.tsx` pattern).

For `useSwipe.test.ts` specifically, the hook returns handlers spread onto a DOM element — render a minimal test `<div>` via `renderHook` or a wrapper component, fire pointer events via `fireEvent`, assert callback invocations. No `showModal` mock needed for the isolated hook test.

### 11. Focus management

`useDialogControl` does not set explicit `autoFocus` on any child. The native `<dialog showModal()>` will auto-focus the first focusable element. For `PhotoViewer`, the first focusable element in the JSX should be the ✕ close button. Position the ✕ button first in the DOM (even if visually top-left via absolute positioning) so focus lands there on open — this satisfies keyboard accessibility without additional `useEffect`.

### 12. Autosave / save logic impact

Zero. `PhotoViewer` is display-only. The viewer receives `photos` (the already-existing `state.photos` array from `useEditorState`) as a prop. No dispatch calls, no `upsertDiary` calls, no changes to `autosaveValue` or `saveFn`. The save pipeline is completely unaffected.

---

## Existing Patterns to Reuse

| Pattern | Source | Reuse in REQ-012 |
|---|---|---|
| `useDialogControl(open, onClose)` | `src/design-system/useDialogControl.ts` | Direct reuse — call with viewer's `open`/`closeViewer` |
| `showModal` mock in tests | All `__tests__/` | Copy to `PhotoViewer.test.tsx` |
| Inline SVG close icon | `MoodPickerSheet.tsx` lines 20-26 | Copy SVG nodes into `PhotoViewer.tsx` |
| Pointer-event handler object shape | `useLongPress.ts` | Template for `useSwipe.ts` |
| `fireEvent.pointer*` + `vi.useFakeTimers()` | `PhotoCarousel.test.tsx` | Template for `useSwipe.test.ts` |
| `aria-label="닫기"` + 44×44 touch target | `IconButton.tsx` / design tokens | Replicate on close button |

---

## Concrete Integration Points

| # | Touch point | File | Detail |
|---|---|---|---|
| I-1 | Wire `onThumbnailTap` | `Editor.tsx` line 191 | Change `() => {}` to `(id) => openViewer(id)` |
| I-2 | Add `PhotoViewer` JSX | `Editor.tsx` after line 191 / before `<Toast>` | Mount `<PhotoViewer>` always (not conditional) |
| I-3 | Add viewer state | New `src/lib/hooks/usePhotoViewer.ts` | `viewerOpen`, `viewerInitialIndex`, `openViewer`, `closeViewer` |
| I-4 | PhotoViewer component | New `src/app/diary/[date]/_components/PhotoViewer.tsx` | `<dialog>` via `useDialogControl`, spreads `useSwipe` handlers |
| I-5 | Swipe hook | New `src/lib/hooks/useSwipe.ts` | Axis-lock, threshold 50 px, returns pointer handler object |
| I-6 | `photos` prop to viewer | `Editor.tsx` | Pass `state.photos` to `PhotoViewer` |

---

## Suggested File Structure

```
src/
  app/diary/[date]/
    _components/
      PhotoViewer.tsx          # new — ~80 lines
      __tests__/
        PhotoViewer.test.tsx   # new — ~80 lines
  lib/hooks/
    useSwipe.ts                # new — ~50 lines
    usePhotoViewer.ts          # new — ~25 lines
    __tests__/
      useSwipe.test.ts         # new — ~60 lines
      usePhotoViewer.test.ts   # optional — ~30 lines
```

---

## File Budget Warnings

- `Editor.tsx` is currently **243 lines**. Adding one hook call + one JSX block (~10 lines) brings it to ~253. This is over the 100-line per-responsibility guideline but `Editor.tsx` is intentionally a multi-responsibility coordinator. No split is warranted; the `usePhotoViewer` extraction limits the growth.
- `PhotoCarousel.tsx` is **96 lines** — at the 100-line boundary. Do not add any code here; the component is already at capacity.
- `PhotoViewer.tsx` must stay under 100 lines. At ~80 lines it is safe; if swipe inline logic is extracted to `useSwipe.ts` it will remain well under budget.

---

## Risks Specific to This Architecture

1. **`onDialogClick` backdrop-close conflict**: The `PhotoViewer` must NOT use `onDialogClick` because a horizontal swipe that ends outside the image (on the dialog's black background) would trigger `e.target === ref.current` and close the viewer mid-swipe. Omit `onDialogClick` entirely; close only via ✕ button, vertical swipe threshold, or ESC.

2. **`dialog::backdrop` color**: `globals.css` sets `dialog::backdrop { background-color: rgba(0,0,0,0.4) }` globally. The viewer's inner `<div>` filling `100dvh` with `bg-black` will mask the backdrop, so there is no visual issue, but implementors should be aware the backdrop exists behind the black fill.

3. **`PhotoCarousel.tsx` at 96 lines**: No code can be added to this file without exceeding the budget. The `onThumbnailTap` prop signature change in `Editor.tsx` is the only touch — `PhotoCarousel.tsx` itself stays unchanged.

4. **Pointer capture**: `useSwipe` will fire `onPointerMove` globally via `pointermove` unless `setPointerCapture` is called on `pointerdown`. Without capture, if the user's pointer exits the dialog element fast, `pointermove` events stop. Recommend `e.currentTarget.setPointerCapture(e.pointerId)` in `useSwipe`'s `onPointerDown` handler, mirroring standard drag-gesture best practice.

5. **`useSwipe` axis-lock**: The Q9 decision (lock axis at first move exceeding 5 px slop) must be implemented correctly. Without it, diagonal swipes could fire both horizontal and vertical callbacks simultaneously.

---

## Unknowns

None blocking. All open questions from the intake have recommended defaults and are low-risk.

---

## Verdict
PASS

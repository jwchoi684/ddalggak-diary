# API / Interface Contract — REQ-012

## Summary

REQ-012 adds a full-screen photo viewer to the diary editor. Three new internal interfaces are introduced: the `useSwipe` gesture hook, the `usePhotoViewer` state-management hook, and the `<PhotoViewer>` component. No HTTP endpoints, no storage keys, no routing changes, and no existing prop signatures change.

---

## Contract Type

Internal TypeScript component and hook interfaces (frontend-only, client-side).

---

## Interfaces

### 1. `useSwipe(options) → SwipeHandlers`

**File:** `src/lib/hooks/useSwipe.ts`

```ts
export interface SwipeOptions {
  onSwipeLeft: () => void;      // triggered when dx < -threshold, axis locked to x
  onSwipeRight: () => void;     // triggered when dx > +threshold, axis locked to x
  onSwipeVertical: () => void;  // triggered when |dy| > threshold, axis locked to y
  threshold?: number;           // default 50 px displacement
  slopPx?: number;              // default 5 px before axis is locked
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export function useSwipe(options: SwipeOptions): SwipeHandlers
```

**Caller responsibilities:**
- Spread all four handlers onto a single DOM element that the user swipes.
- Pass stable callbacks or accept that options are stored in a ref (callbacks are never stale).
- Do not pass `undefined` for the three required callbacks.

**Callee guarantees:**
- Returned handlers are referentially stable (via `useCallback`).
- All pointer-event state is stored in `useRef`; no re-renders occur during a drag.
- Axis lock is set once per gesture and never changes mid-gesture.
- Callbacks fire only on `pointerup`, never on `pointermove`.
- `pointercancel` resets state and fires no callbacks.
- `setPointerCapture` is called inside a `try/catch` (safe under happy-dom).

**Invariants:**
- Exactly one of `onSwipeLeft`, `onSwipeRight`, `onSwipeVertical`, or nothing fires per gesture.
- Sub-threshold displacement produces no callback.
- Diagonal motion: whichever axis first exceeds `slopPx` wins; the other axis is ignored for the remainder of that gesture.

---

### 2. `usePhotoViewer(photos) → state + handlers`

**File:** `src/lib/hooks/usePhotoViewer.ts`

```ts
import type { Photo } from '@/lib/storage';

export function usePhotoViewer(photos: Photo[]): {
  viewerOpen: boolean;
  viewerInitialIndex: number;
  openViewer: (id: string) => void;
  closeViewer: () => void;
}
```

**Caller responsibilities:**
- Pass the same `photos` array reference that is rendered by `<PhotoCarousel>` (no duplication).
- Call `openViewer(id)` with a valid photo `id` from that array (unknown ids fall back to index 0).
- Call `closeViewer()` to dismiss; do not mutate `viewerOpen` directly.

**Callee guarantees:**
- Initial state: `viewerOpen = false`, `viewerInitialIndex = 0`.
- `openViewer`: sets `viewerInitialIndex` to `photos.findIndex(p => p.id === id)`, clamped to `0` for unknown ids; sets `viewerOpen = true`.
- `closeViewer`: sets `viewerOpen = false`.
- Both action functions are referentially stable (`useCallback`).

**Invariants:**
- `viewerInitialIndex` is always in `[0, photos.length - 1]` when `viewerOpen` is `true`.
- When `photos` is empty, `viewerInitialIndex` is `0` (defensive fallback; viewer should not be opened in this state in practice).

---

### 3. `<PhotoViewer>` component

**File:** `src/app/diary/[date]/_components/PhotoViewer.tsx`

```ts
import type { Photo } from '@/lib/storage';

export interface PhotoViewerProps {
  photos: Photo[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewer(props: PhotoViewerProps): React.ReactElement
```

**Caller responsibilities:**
- Mount `<PhotoViewer>` unconditionally in the DOM (not inside a conditional render); `open` controls visibility via `useDialogControl`.
- Place it after `<PhotoCarousel>` and before `<Toast>` in `Editor.tsx`.
- Pass `initialIndex` within `[0, photos.length - 1]`; out-of-range values are clamped internally.
- Wire `onClose` to `closeViewer` from `usePhotoViewer`.

**Callee guarantees:**
- Uses `useDialogControl(open, onClose)` — same hook pattern as `MoodPickerSheet`. The `<dialog>` `showModal()`/`close()` lifecycle is managed internally.
- `currentIndex` is reset on every `open` transition via `useEffect([open, initialIndex])`, clamped to `[0, photos.length - 1]`.
- Left swipe increments `currentIndex` (capped at `photos.length - 1`); right swipe decrements (floored at `0`).
- Vertical swipe calls `onClose`.
- ESC key calls `onClose` via the `cancel` event in `useDialogControl`.
- When `photos.length === 0`, renders an empty closed `<dialog>` (ref attached; no visible content). No crash.
- `onDialogClick` from `useDialogControl` is intentionally NOT spread on `<dialog>` to avoid accidental close when swipe ends over the backdrop.
- The `"use client"` directive is present at the top of the file.

**Test selectors (callee guarantees these):**

| Element | Locator |
|---|---|
| Dialog | `role="dialog"` (implicit from `<dialog>`) |
| Close button | `aria-label="닫기"`, `data-testid="photo-viewer-close"` |
| Image | `data-testid="photo-viewer-img"` |
| Counter | `data-testid="photo-viewer-counter"` |

---

## Storage Contracts

Zero storage writes. Zero new storage keys. The viewer reads `photos` (already in `state.photos` from the existing `ddalkkak:diaries:v1` localStorage entry) and never writes to any store. This is confirmed by the purely display-only nature of REQ-012 and the absence of any `localStorage` calls in any of the three new files.

---

## Korean Strings

| Location | String | Usage |
|---|---|---|
| Close button `aria-label` | `닫기` | Accessibility label |
| Image `alt` attribute | `사진 {currentIndex + 1}` | e.g., `사진 1`, `사진 3` |
| Counter `<span>` content | `{currentIndex + 1} / {photos.length}` | e.g., `2 / 5` — numeric only, no Korean suffix |

No other UI strings introduced.

---

## Caller Invariants

1. `usePhotoViewer` and `<PhotoViewer>` must receive the same `photos` array (same reference from `state.photos`).
2. `openViewer` must only be called from `PhotoCarousel`'s `onThumbnailTap` callback.
3. `<PhotoViewer>` must be mounted unconditionally; the `open` prop drives show/hide internally.
4. Swipe handlers from `useSwipe` must be spread on the inner container `<div>`, not on `<dialog>` itself.
5. `initialIndex` passed to `<PhotoViewer>` must equal `viewerInitialIndex` from `usePhotoViewer`.

---

## Backward Compatibility

- `PhotoCarousel.onThumbnailTap` is already typed as `(id: string) => void` and stubbed `() => {}` in `Editor.tsx`. REQ-012 replaces the stub with `openViewer` — no prop signature change at the carousel boundary.
- `useDialogControl` API is unchanged.
- `PhotoCarousel.tsx` is not modified.
- All 15 existing `Editor.test.tsx` cases are unaffected because `<PhotoViewer open={false}>` does not call `showModal` in `useDialogControl`.
- No new optional or required props are added to any existing component.

---

## Verdict
PASS

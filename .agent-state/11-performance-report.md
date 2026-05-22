# Performance Review Report — REQ-012

## Summary

REQ-012 adds a display-only full-screen photo viewer (tap-to-open, swipe-to-navigate, swipe/button-to-close). The feature is entirely client-side, involves no queries, no network calls, no pagination, and no background jobs. All render-critical paths are correctly bounded. No blocking performance issues were found.

## Scope

Files reviewed:

- `src/lib/hooks/useSwipe.ts`
- `src/lib/hooks/usePhotoViewer.ts`
- `src/app/diary/[date]/_components/PhotoViewer.tsx`
- `.agent-state/03-technical-design.md`
- `.agent-state/07-implementation-report.md`
- `.agent-state/09-code-review-report.md`

## Findings

### 1. useSwipe — zero re-renders during drag

`startX`, `startY`, `lockedAxis`, and `active` are all `useRef`. `onPointerMove` only writes to those refs; it never calls `setState`. All four handlers are stable via `useCallback` with empty dep arrays (callbacks are read from `optionsRef.current` at call time, not captured). The options object itself is written to `optionsRef.current = options` on every render — a single ref assignment, not a new closure. Drag interactions produce zero React re-renders. This is correct.

### 2. Image swap cost — negligible

`<img src={photo.dataUrl}>` swaps the `src` attribute when `currentIndex` changes. The photos are already decoded `base64` strings held in memory via `localStorage`. There is no network fetch. The browser's image decode cache retains the decoded bitmap for the same `src` string across renders. For a photo viewer bounded by the 10-photo-per-entry limit, switching images is a synchronous attribute mutation with a pre-decoded bitmap lookup. Cost is negligible.

### 3. DOM gate — correct

The inner content (button, img, counter, container div) is wrapped in `{open && (...)}`. When `open` is `false` the children are not in the DOM. The only elements present when closed are the outer `<dialog>` element itself and its `ref`. This is the minimum possible DOM cost for a mounted-but-closed modal.

### 4. PhotoViewer is mounted always — cost verified

`<PhotoViewer>` is unconditionally mounted in `Editor.tsx`. When `open=false` the component renders only the bare `<dialog ref={ref} className="...">` shell (the `{open && (...)}` gate eliminates all inner nodes). All hooks (`useDialogControl`, `useSwipe`, `useState`, `useEffect`, `useCallback`) still run, but their steady-state cost is negligible: refs are read, no state transitions are triggered, no effects fire (all effects are gated on `open` changing). This is correct and consistent with the existing `MoodPickerSheet` and `ConfirmDialog` patterns in this codebase.

### 5. usePhotoViewer — state changes bounded

`usePhotoViewer` holds two `useState` values: `viewerOpen` and `viewerInitialIndex`. Both change only on open and close transitions (user-driven, not on every render). `openViewer` is memoized with `[photos]` as its dep array. Since `photos` is `state.photos` from the reducer, it only changes reference when photos are actually added or deleted, not on unrelated Editor state changes (mood, text, etc.). `closeViewer` is memoized with an empty dep array. No spurious re-renders.

### 6. useEffect for currentIndex reset — bounded

The `useEffect` in `PhotoViewer.tsx` has deps `[open, initialIndex, photos.length]`. It runs only when one of those three changes. `photos.length` changes only on photo add/delete; `open` changes on open/close; `initialIndex` changes on thumbnail tap. The effect body calls `setCurrentIndex` only when `open === true`, avoiding a redundant state write on close. This is the minimum viable reset strategy.

### 7. onSwipeLeft dependency — correct

`onSwipeLeft` is memoized with `[photos.length]`. This is intentional: it needs `photos.length` to compute the upper bound for `Math.min(i + 1, photos.length - 1)`. The functional updater form `setCurrentIndex(i => ...)` is used correctly, but `photos.length` must be captured in the closure since it is not accessible from the updater alone. The dep array is precise.

### 8. Payload size — bounded by PRD constraint

Photos are stored as base64 `dataUrl` strings in `localStorage` under the `ddalkkak:diaries:v1` key. `localStorage` is browser-limited to ~5 MB total; per-photo cap is 150 KB (REQ-011 `MAX_PHOTO_DATAURL_BYTES`). The viewer renders one image at a time. There is no bulk payload at render time — only the active `photo.dataUrl` string is referenced in the `src` attribute. No large payload risk.

### 9. N+1 risks — none

There are no data-fetching calls in this feature. All data is already in the reducer state. The `openViewer(id)` call does a single `Array.findIndex` over `state.photos` — O(n) where n is bounded to 10 by `MAX_PHOTOS_PER_ENTRY`.

### 10. Observability

This is a display-only modal with no async operations. No observability instrumentation is required or expected.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. `onSwipeLeft` closing over `photos.length` via `useCallback([photos.length])` while using a functional updater `setCurrentIndex(i => ...)` is slightly inconsistent — the functional form was chosen precisely to avoid needing the current value of `currentIndex`, but `photos.length` is still needed in the closure. This is correct as written but could alternatively use a ref for `photos.length` to keep the handler permanently stable. Style preference, not a correctness or performance concern.

2. The `useEffect` dep array includes `photos.length` but not `photos` itself. If a photo's `dataUrl` changed in-place at the same index (not currently possible via the reducer, which only appends or deletes), `currentIndex` would not reset. Safe given the current reducer design but worth a comment.

## Verdict
PASS

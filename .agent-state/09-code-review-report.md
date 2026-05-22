# Code Review Report — REQ-011 (Cycle 2)

## Summary

Cycle 2 re-review after the developer addressed B-1 (per-instance `overlayRef` + `useEffect` inside `Thumb`), NB-3 (FileReader string type-guard), NB-4 (`didCancel` ref suppresses short-tap after scroll-slop cancel), a redundant `role="button"` nit, and added PC8 regression test. No blocking issues remain. All 12 API contract invariants are met. The `onActivate('')` empty-string sentinel is slightly unconventional but documented and clean. The B-1 fix is correct with no memory leaks.

---

## Files Reviewed

- `src/app/diary/[date]/_components/PhotoCarousel.tsx` (96 lines)
- `src/lib/storage/photoBase64.ts` (52 lines)
- `src/lib/hooks/useLongPress.ts` (45 lines)
- `src/app/diary/[date]/_components/Editor.tsx` (243 lines)
- `src/lib/hooks/useEditorState.ts` (119 lines)
- `src/app/diary/[date]/_components/EditorToolbar.tsx` (111 lines)
- `src/lib/hooks/useHorizontalDatePicker.ts` (lines 1–13, AutosaveValue)
- `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` (137 lines, including PC8)

---

## Blocking Issues

None.

---

## Non-Blocking Suggestions

1. **`onPointerLeave`/`onPointerCancel` do not set `didCancel.current = true`.**
   The `{...lp}` spread provides `onPointerLeave` and `onPointerCancel` from `useLongPress`, both of which call `cancel()` (clearing the timer) but do not touch `didCancel.current`. In the scenario where a pointer leaves the element (e.g., stylus drift, unusual touch gesture), the timer is cancelled but `didCancel` stays false. If `pointerUp` fires on the same element afterward (some browsers do fire this after `pointerLeave`), `!didLong.current && !didCancel.current` would be true and `onShortTap` would fire erroneously. In practice this path is rare because pointer capture is not explicitly set, so `pointerUp` outside the element does not hit the element's handler. Functional impact is low, but the fix would be to override `onPointerLeave` and `onPointerCancel` in the same pattern as `onPointerMove`.

2. **`onThumbnailTap={() => {}}` inline arrow at `Editor.tsx` line 190.**
   An inline arrow is passed as `onThumbnailTap` to `PhotoCarousel`. Inside `PhotoCarousel`, `shortTap` is a `useCallback` with `[onThumbnailTap]` in its deps, so `shortTap` recreates every render of `Editor`. This is harmless for correctness (REQ-012 has not wired this yet), but when REQ-012 does wire a real callback, the same pattern would cause unnecessary recreations. A `useCallback(() => {}, [])` at the call site would prevent this.

---

## Nits

- `PhotoCarousel.tsx` line 81: the comment `// activate('') is used by Thumb's tap-outside handler to clear its own active state.` is accurate. The convention of `'' => null` could instead use `null` directly by changing `onActivate` to `(id: string | null) => void`. Either is fine; the current approach avoids a type change in `Thumb`'s props signature.
- `PhotoCarousel.tsx` line 88: `className="no-scrollbar bg-cream"` — `bg-cream` on the carousel container adds the cream background behind thumbnails. This is consistent with the editor background, but it is a visual detail not called out in the contract. No issue.

---

## Positive Notes

- **B-1 resolution is correct.** Each `Thumb` holds its own `overlayRef`. The `useEffect` at line 31–40 attaches the `document.pointerdown` listener only when `isActive` is true and removes it in the effect cleanup. This is the canonical React pattern. There are no leaks: when `isActive` flips false (i.e., another photo becomes active), the previous `Thumb`'s effect cleanup removes the listener before the new one attaches. When a `Thumb` unmounts (photo deleted), the cleanup also runs.
- **`onActivate('')` sentinel is clean for the use case.** The `activate` callback (line 82) maps `'' => null` with a clear comment. The empty-string sentinel avoids widening the `onActivate` type to `(id: string | null) => void` while still signalling "clear". It is documented and not fragile.
- **PC8 exercises the correct invariant.** The test: (a) long-presses photo A, verifies overlay A, (b) long-presses photo B, verifies overlay B appears and overlay A disappears (proving single-`activeId` guarantee), (c) taps outside, verifies overlay B closes. All three assertions together constitute a full regression test for B-1.
- **NB-3 fix (`photoBase64.ts` line 12) is correct.** `typeof e.target?.result !== 'string'` rejects `ArrayBuffer` results before calling `resolve`, conforming to the callee guarantee that `dataUrl` is always a string.
- **NB-4 fix is correct.** `didCancel` resets on `pointerDown`, sets on `pointerMove` (which also calls `lp.onPointerMove`). The explicit handlers after `{...lp}` override the spread's handlers and chain internally. Last-prop-wins in JSX props is the correct mechanism here.
- **`role="button"` nit removed.** The `<button>` element in the delete overlay no longer has a redundant `role="button"` attribute.
- **`useEditorState` reducer is correct.** `ADD_PHOTO` appends, `DELETE_PHOTO` filters idempotently, `MARK_SAVED` snapshot excludes photos (dirty detection is mood/text/textAlign only, as specified by contract), `INITIAL_STATE.photos = []`, `LOAD_ENTRY` spreads `entry.photos ?? []`.
- **`saveFn` try/catch at `Editor.tsx` line 56–64** correctly skips `MARK_SAVED` on any thrown error and shows the Korean toast — consistent with the storage contract.
- **`galleryDisabled` prop implementation** matches contract: `disabled` attribute set, `opacity-50 cursor-not-allowed` classes applied, 44×44 touch target maintained.

---

## Test Coverage Assessment

| Case | Scenario | Status |
|------|----------|--------|
| PC1 | Empty photos → null render | Covered |
| PC2 | N thumbnails, correct testid and alt | Covered |
| PC3 | 500ms hold → overlay appears | Covered |
| PC4 | Delete button → `onDelete` called, overlay hidden | Covered |
| PC5 | Tap outside overlay → overlay dismissed | Covered |
| PC6 | `navigator.vibrate(50)` exactly once | Covered |
| PC7 | Short tap → `onThumbnailTap` called | Covered |
| PC8 | Multi-photo B-1 regression | Covered (new in cycle 2) |
| PB1–PB6 | `addPhotoFromFile` unit cases | Covered |
| LP1–LP6 | `useLongPress` unit cases | Covered |
| ES-photo-1..3 | Reducer ADD_PHOTO / DELETE_PHOTO / LOAD_ENTRY | Covered |
| C-photo-1..4 | Editor integration: add, limit toast, delete, disabled | Covered |
| PE1, PE2 | E2E: add photo persists; 10-photo cap disables gallery | Covered |

Coverage is comprehensive. The `onPointerLeave`/`onPointerCancel` + `didCancel` edge case (Non-Blocking #1 above) has no dedicated test, but the scenario is low-probability and the existing test suite covers all contract-specified behaviors.

---

## Architecture Consistency

- `"use client"` present on all new files that use React hooks or browser APIs.
- New files placed in the correct directories: `src/lib/storage/photoBase64.ts`, `src/lib/hooks/useLongPress.ts`, `src/app/diary/[date]/_components/PhotoCarousel.tsx`.
- `no-scrollbar` utility reused from the existing `HorizontalDatePicker` pattern.
- `generateId()` from `@/lib/storage` used for photo IDs — consistent with diary entry ID pattern.
- `useToast` / `<Toast>` single-instance pattern preserved; no second toast mount introduced.
- File size: `PhotoCarousel.tsx` at 96 lines is within budget. `Editor.tsx` at 243 lines remains over budget (pre-existing; flagged for extraction before REQ-012, not a blocker for this REQ).

---

## Contract Consistency

All six interface contracts from `04-api-contract.md` are satisfied:

| Contract | Met? | Note |
|----------|------|------|
| `addPhotoFromFile` signature and guarantees | Met | NB-3 fix strengthens the string guarantee |
| `useLongPress` signature and guarantees | Met | 5px slop, unmount cleanup, no state leaks |
| `PhotoCarousel` props, testids, overlay behaviour | Met | Per-instance refs, tap-outside dismissal, all testids present |
| `useEditorState` reducer additions | Met | ADD_PHOTO appends, DELETE_PHOTO idempotent, MARK_SAVED excludes photos |
| `AutosaveValue.photos` required field | Met | `Editor.tsx` line 46 includes `photos: state.photos` |
| `EditorToolbar.galleryDisabled?` | Met | Optional, default false, correct disabled state |

Korean string invariants (토스트, 오버레이 레이블, 썸네일 alt) all match the contract table exactly.

---

## Verdict
PASS

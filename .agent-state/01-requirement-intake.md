# Requirement Intake — REQ-011

## Restatement

REQ-011 adds photo attachment capability to the diary editor. The user taps the existing gallery icon stub in `EditorToolbar` to open a native file picker (`accept="image/*"`). The selected image is read as a base64 data URL via `FileReader` and appended to the `DiaryEntry.photos` array (typed as `Photo[]` with `id`, `dataUrl`, `width`, `height`, `addedAt` fields). Below the mood header in the editor, a horizontally scrolling carousel of square thumbnails (80–96 px, 8 px gap) appears whenever the photos array is non-empty; it is completely hidden when empty. A 500 ms long-press on any thumbnail shows a delete overlay with a "삭제" button and triggers haptic feedback; tapping elsewhere dismisses the overlay. The feature enforces a hard cap of 10 photos. All photo mutations flow through the existing REQ-009 autosave path — no separate persistence code is introduced.

## In Scope

- Activating the gallery icon button in `EditorToolbar` to open a hidden `<input type="file" accept="image/*">`.
- Reading the selected file with `FileReader.readAsDataURL` and constructing a `Photo` object (UUID via `generateId()`, `dataUrl`, `width`, `height`, `addedAt` ISO timestamp).
- Appending the new `Photo` to `DiaryEntry.photos` and passing the updated entry to the existing REQ-009 `saveFn`.
- `PhotoCarousel` component: horizontal scroll, square thumbnails 80–96 px, 8 px gap, hidden when `photos.length === 0`.
- `useLongPress` hook: fires callback after exactly 500 ms hold; cancels on pointer-up or move before 500 ms.
- Delete overlay per thumbnail: appears on long-press, dismissed on tap-elsewhere or after deletion.
- Haptic feedback: `navigator.vibrate(50)` with feature detection.
- Max-10 enforcement: gallery icon becomes `disabled` (or shows a toast "최대 10장입니다") when `photos.length >= 10`. The check happens before appending.
- Korean copy for the limit message and the delete button label.

## Out of Scope (with pointer to owner REQ if known)

| Excluded Item | Owner |
|---|---|
| Full-screen photo viewer (tap on thumbnail) | REQ-012 |
| IndexedDB migration for large photo storage | v2 (§7.3 / PRD §3.9 note) |
| Camera capture (`capture` attribute) | Non-goal per REQ-011 |
| Automatic image resize / compression | Non-goal for MVP (risk noted, not implemented) |
| Separate thumbnail blob storage | v2 (PRD §7.3 / §10.9) |
| Calendar bottom photo strip | v2 (PRD §4.1.6) |

## Invariants

1. `DiaryEntry.photos` is `Photo[]` — each element has `id: string` (UUID), `dataUrl: string` (base64 data URL), `width: number`, `height: number`, `addedAt: string` (ISO 8601). Do not flatten to `string[]`; the schema in `types.ts` is already correct and must not be altered.
2. `dataUrl` must come from `FileReader.readAsDataURL`. Blob-URL (`URL.createObjectURL`) is explicitly disallowed — it does not survive page refresh.
3. The 10-photo cap is checked **before** the FileReader callback writes to state. If `photos.length >= 10`, the new photo is never appended.
4. All photo mutations (add, delete) must call the same `saveFn` / autosave hook that REQ-009 established. No separate `localStorage.setItem` calls in this REQ's code.
5. Long-press threshold is exactly 500 ms. Pointer-up or pointer-move (beyond a small slop, e.g. 5 px) before 500 ms must cancel the timer.
6. Tap (short press, < 500 ms) on a thumbnail must NOT trigger the delete overlay. It is reserved for the full-screen viewer (REQ-012) — for now it is a no-op or fires a placeholder callback.
7. Carousel section must have zero rendered height (not just `opacity: 0` or `visibility: hidden`) when `photos.length === 0`.
8. `scroll-snap-type` behavior on the carousel must match the horizontal scroll pattern established by REQ-010's inline calendar strip — use `overflow-x: auto; scroll-snap-type: x mandatory` with `scroll-snap-align: start` on each thumbnail.
9. The gallery icon's 44×44 px touch target, line-icon style, and achromatic color (`text-meta`) must not change — only its disabled state and wiring change.
10. All user-facing strings are Korean: "삭제", "최대 10장입니다".

## Open Questions and Recommended Defaults

1. **File size cap per image.** PRD does not specify. Recommended default: reject any file where `file.size > 5_242_880` (5 MB) before calling FileReader; show a toast "파일이 너무 큽니다 (최대 5MB)". This prevents a single image from filling the entire localStorage budget.

2. **localStorage size warning.** PRD §3.9 acknowledges the 5 MB risk but marks automatic resize as out of scope. Recommended default: after each successful save, if the serialized entry's `photos` field length exceeds roughly 4 MB total (estimated as `photos.reduce((s, p) => s + p.dataUrl.length, 0) > 4_000_000`), show a warning toast "저장 용량이 거의 가득 찼습니다" — but do not block saving. Leave quota-exceeded error handling to the existing REQ-010 toast path.

3. **Single-select vs multi-select file input.** PRD is silent. Recommended default: single-select only (`<input type="file" accept="image/*">` without `multiple`). Multi-file adds loop complexity and risks hitting the cap or storage limit in one tap. If the user selects multiple via OS workaround the browser will only deliver one file anyway without `multiple`.

4. **Long-press visual feedback during the 500 ms window.** PRD specifies nothing. Recommended default: no progress ring. Simply jump to the overlay at 500 ms. A subtle `scale(0.95)` on the thumbnail during the hold is acceptable but not required — keeps the hook API simple.

5. **Haptic on desktop.** `navigator.vibrate` is undefined in most desktop browsers. Recommended default: feature-detect with `if (navigator.vibrate) navigator.vibrate(50)` — silent fail on desktop. No polyfill needed.

6. **Order of newly added photos.** PRD says "순서 보존" (preserve order). Recommended default: append to the end of the array (`photos.push(newPhoto)`), not prepend.

7. **Deletion UX — immediate vs one confirmation.** PRD says "즉시 삭제(또는 1회 확인)". Recommended default: immediate delete on tap of the overlay button (no secondary confirm dialog). The deletion is not easily undoable from localStorage, so show an undo toast ("삭제되었습니다 · 실행취소") that reverses within 3 s, consistent with existing toast patterns.

8. **Image type enforcement.** `accept="image/*"` lets the OS filter. Recommended default: no additional MIME-type allowlist check in JS — rely on the browser's native file picker filtering. If a non-image slips through (e.g. a renamed file), `FileReader.readAsDataURL` will still encode it; the `<img src={dataUrl}>` will simply fail to render, which is acceptable for MVP.

9. **`EditorToolbar` disabled state for gallery icon.** When `photos.length >= 10`, recommended default: set `disabled` prop on the button and add `opacity-50 cursor-not-allowed` classes, rather than showing a toast on every tap. The toast fires only if the user somehow circumvents the button disable (e.g. JS keyboard shortcut).

10. **Carousel snap vs free scroll.** Recommended default: `scroll-snap-type: x mandatory` with `scroll-snap-align: start`, matching REQ-010's strip. Free scroll would look inconsistent.

## CLAUDE.md Constraints

- **UI reuse rule**: The gallery button already exists in `EditorToolbar.tsx`. Do not create a second button or icon. Only add `disabled`, `photoCount` prop, and wire the hidden file input.
- **File-size rule**: `EditorToolbar.tsx` is currently 108 lines. Adding photo logic to it would push it further over the limit. Extract into: `PhotoCarousel.tsx` (carousel + overlay), `useLongPress.ts` (hook), `photoBase64.ts` (FileReader utility + size check). Pass `onGalleryTap` through `EditorToolbar` as it already exists — the actual file input lives in the parent editor page or a thin wrapper.
- **Design language**: Overlay background must use `background: rgba(0,0,0,0.45)` or similar neutral dark scrim, not the brand peach. Delete button label color is white on dark scrim — stays achromatic.
- **Touch target**: All interactive elements in overlay maintain 44×44 px minimum, per CLAUDE.md §1.6.

## Risks / Edge Cases

- **localStorage quota exceeded after photo add**: The existing REQ-009/REQ-010 save path presumably wraps `localStorage.setItem` in a try/catch and shows a toast. Verify that this catch exists before merging; if not, REQ-011 must add it.
- **Very large image (>5 MB) not caught**: Base64 encoding expands size by ~33%. A 4 MB JPEG becomes ~5.3 MB as a base64 string, which can alone exhaust the entire localStorage budget. The per-file 5 MB cap (Open Question 1) is the primary guard.
- **Long-press vs scroll conflict on the carousel**: `touchstart`/`touchend`/`touchmove` events on the carousel container will fire during normal scrolling. The `useLongPress` hook must cancel the timer on `touchmove` with a slop threshold (≥5 px translation) to avoid triggering the overlay when the user is just scrolling.
- **Multiple rapid taps on gallery button**: If the user taps the gallery button before a previous FileReader call resolves, a second file dialog opens. Recommend setting a `isProcessing` flag that disables the button between tap and FileReader onload.
- **`EditorToolbar` is 108 lines**: Already over the 100-line guideline. Splitting out gallery-related props keeps it under control but the file needs a focused split at this REQ boundary.
- **REQ-012 placeholder tap**: Tapping a thumbnail (short press) currently should do nothing meaningful (REQ-012 is TODO). The `PhotoCarousel` must accept an `onThumbnailTap` prop (no-op by default) so REQ-012 can wire it without modifying `PhotoCarousel` internals.

## Dependency Check

| Dependency | Required Status | Actual Status | Notes |
|---|---|---|---|
| REQ-002 (data model + storage layer) | DONE | DONE | `Photo` interface confirmed in `types.ts` |
| REQ-009 (editor + autosave) | DONE | DONE | `EditorToolbar.onGalleryTap` stub confirmed in source |
| REQ-010 (inline calendar strip) | DONE (sibling, not dependency) | DONE | Scroll-snap pattern to reuse |

All declared dependencies are DONE. REQ-012 (full-screen viewer) depends on REQ-011, not the reverse — no blocker.

## Verdict
PASS

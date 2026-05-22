# Requirement Intake — REQ-012

## Restatement

When a user taps a photo thumbnail in the `PhotoCarousel` (a short tap, < 500 ms), a full-screen photo viewer opens over the editor. The viewer shows the tapped photo centered with `object-fit: contain` on a pure-black background. The user can swipe left/right to browse adjacent photos in the same carousel order, swipe up/down or tap the top-left ✕ button to dismiss the viewer and return to the editor. A "current / total" counter is displayed at the top-right. The viewer is a modal — closing it does not push or pop browser history. The `PhotoCarousel.onThumbnailTap` prop (already stubbed in `Editor.tsx` as `() => {}`) must be wired to open the viewer at the correct initial index.

## In Scope

- New `PhotoViewer` component (full-screen `<dialog>` using `useDialogControl`).
- New `useSwipe` hook (`src/lib/hooks/useSwipe.ts`) handling horizontal (next/prev) and vertical (close) swipe gestures via pointer events.
- Wire `Editor.tsx`'s `onThumbnailTap={() => {}}` to open `PhotoViewer` at the index matching the tapped photo id.
- Local state in `Editor.tsx` (or a small wrapper) tracking `viewerOpen: boolean` and `viewerInitialIndex: number`.
- Top-left ✕ close button, 44×44 touch target, aria-label `"닫기"`.
- Top-right counter label, e.g. `"3 / 5"`.
- Horizontal swipe: index ± 1, bounded at 0 and `photos.length - 1`.
- Vertical swipe: triggers `onClose`.
- ESC key closes (free from native `<dialog>`).
- Body scroll lock while viewer open (native `<dialog>` with `showModal()` handles this automatically).
- Height unit `100dvh` to account for collapsing browser chrome on mobile.
- Unit tests: initial index, swipe left/right boundary, close callback.

## Out of Scope (with pointer to owner REQ if known)

- Pinch-to-zoom — explicitly deferred to v2 (per REQ-012 non-goals).
- Photo sharing — v2.
- Invoking the viewer from anywhere other than `PhotoCarousel` — out of spec.
- Single-tap header toggle (show/hide UI chrome) — PRD §4.4.2 marks this "optional"; excluded from MVP.
- Animation transitions between photos (slide or cross-fade) — not specified; default is instant (see Open Questions).
- Photo deletion from within the viewer — not specified; belongs to REQ-011's carousel overlay.
- History-stack entry for the viewer — explicitly excluded (REQ-012 notes, PRD §2.1).

## Invariants

- Background: pure black (`#000000`), not the app cream `#FAF6EE`.
- Image display: `object-fit: contain`, horizontally and vertically centered.
- Viewer height: `100dvh` (not `100vh`) to handle mobile browser chrome.
- Close button: top-left position, 44×44 px touch target, white icon on black bg, aria-label `"닫기"`.
- Counter: top-right, format `"N / M"` (compact, no `장` suffix — see Open Questions).
- Swipe direction semantics: left = next photo (higher index), right = prev photo (lower index) — standard gallery convention.
- Swipe boundary: hard stop at index 0 (no wrap-around) and index `photos.length - 1`.
- Vertical swipe (up or down) calls `onClose`.
- Initial index: derived from the `id` passed to `onThumbnailTap` by looking up its position in `photos` array. Out-of-bounds is clamped to 0 defensively.
- Modal, not routed: `useDialogControl` / `showModal()`, no Next.js router push.
- UI component discovery rule (CLAUDE.md): design-system folder searched first; `useDialogControl` and `BottomSheet` are reused reference patterns. `PhotoViewer` is a new full-screen variant, not a BottomSheet extension.
- File size rule (CLAUDE.md): `PhotoViewer.tsx` and `useSwipe.ts` are separate files; if either approaches 100 lines it splits further.
- Korean strings for all user-visible copy.
- Pointer events (consistent with `useLongPress` in REQ-011) — not touch events.

## Open Questions and Recommended Defaults

| # | Question | Recommended Default |
|---|---|---|
| Q1 | **Placement of `PhotoViewer.tsx`**: design-system (`src/design-system/`) or diary-scoped (`src/app/diary/[date]/_components/`)? | Diary-scoped (`src/app/diary/[date]/_components/PhotoViewer.tsx`). The viewer has no plausible reuse outside the editor in this MVP. Place `useSwipe` in `src/lib/hooks/useSwipe.ts` since gesture hooks are reusable. |
| Q2 | **Swipe distance threshold**: 50 px? 80 px? Velocity-based? | 50 px displacement threshold, no velocity calculation. Simple and predictable; matches mobile gallery norms. |
| Q3 | **Photo transition animation**: cross-fade, slide, or instant? | Instant (no CSS transition). The app has a low-animation feel and this is the fastest-to-implement safe option. |
| Q4 | **Counter suffix**: `"3 / 5"` vs `"3 / 5장"`? | `"3 / 5"` — compact, consistent with PRD's own example text in §4.4.1. |
| Q5 | **Single-photo case**: should swipe gesture handlers even be attached? | Attach but treat as no-op (index clamp prevents any change). No visual arrow hints needed. |
| Q6 | **Body scroll lock**: does `showModal()` handle it? | Yes, native `<dialog showModal()>` creates a top-layer entry that blocks scroll on the document. No extra `overflow: hidden` needed on `<body>`. |
| Q7 | **`useSwipe` vs inline pointer logic in `PhotoViewer`**: | New `src/lib/hooks/useSwipe.ts` hook returning `{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }` handlers. Consistent with `useLongPress` pattern; easier to unit-test in isolation. |
| Q8 | **Race condition — photo deleted while viewer open**: | Out of scope per spec. If `photos` array shrinks and `currentIndex` exceeds new length, clamp to `photos.length - 1`; if `photos` becomes empty, close the viewer. |
| Q9 | **Diagonal swipe ambiguity**: a drag could be both horizontal and vertical. | Lock axis on `pointerdown` using whichever axis has greater displacement at the first `pointermove` event that exceeds 5 px slop (same slop as `useLongPress`). |

## Dependency Check

| Dependency | Required Status | Actual Status |
|---|---|---|
| REQ-011 (사진 추가 / 카로젤 / 길게 누름 삭제) | DONE | DONE (confirmed in index.md; `PhotoCarousel` component and `onThumbnailTap` prop are present in `src/app/diary/[date]/_components/PhotoCarousel.tsx`; `Editor.tsx` wires `onThumbnailTap={() => {}}`) |

All dependencies satisfied.

## Verdict
PASS

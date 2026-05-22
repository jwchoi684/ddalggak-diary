# Code Review Report — REQ-012

## Summary

REQ-012 (사진 전체화면 뷰어) adds three new files (`useSwipe.ts`, `usePhotoViewer.ts`, `PhotoViewer.tsx`) and modifies `Editor.tsx` and its test file. Two correctness defects were discovered and fixed during Phase 10 verification. The implementation correctly follows the technical design, API contract, and existing architecture patterns. All acceptance criteria are met.

## Files Reviewed

| File | Status | Notes |
|---|---|---|
| `src/lib/hooks/useSwipe.ts` | New | 82 lines (target was ~50) |
| `src/lib/hooks/usePhotoViewer.ts` | New | 29 lines |
| `src/app/diary/[date]/_components/PhotoViewer.tsx` | New | 106 lines (target was ~80, soft cap 100) |
| `src/app/diary/[date]/_components/Editor.tsx` | Modified | 253 lines (accepted at design phase) |
| `src/lib/hooks/__tests__/useSwipe.test.ts` | New | 7 cases |
| `src/lib/hooks/__tests__/usePhotoViewer.test.ts` | New | 4 cases |
| `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` | New | 7 cases |
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | Modified | +2 cases |
| `e2e/photo-viewer.spec.ts` | New | 1 E2E case |
| `src/app/diary/[date]/_components/PhotoCarousel.tsx` | UNCHANGED | 96 lines, budget protected |

## Blocking Issues

None.

## Non-Blocking Suggestions

**1. Focus management gap when `{open && (...)}` is used**

The design spec states "Close button is first focusable element in DOM so `showModal()` auto-focus lands here." With `{open && (...)}`, children are absent from the DOM when `open=false`. When `open` flips to `true`, React renders the children synchronously, but `useDialogControl`'s `showModal()` fires inside a `useEffect` — which runs after the render commit. In practice this ordering is correct (children are in the DOM by the time `showModal()` runs), but it is a subtle dependency on React's commit-then-effect sequencing. The design note claiming auto-focus reliability should be acknowledged as dependent on this ordering, not a hard guarantee in all React environments. This is acceptable for the current Next.js + React 18 stack but worth a comment.

**2. `useSwipe.ts` exceeds the file-size target significantly**

The target was ~50 lines; actual is 82 lines (64% over). The implementation report acknowledges this. The code is clean and not a candidate for splitting, but the size overage is larger than the typical "a few lines over" exception. No action required now.

**3. Empty-photos guard shows an empty opened dialog if `openViewer` were ever called with an empty array**

When `photos.length === 0`, hooks (`useDialogControl`, `useEffect`, etc.) still run. If `open=true` somehow propagated with an empty array, `useDialogControl` would call `showModal()` on an empty `<dialog>`, producing a bare black-backdrop top-layer with no content and no close affordance (ESC still works via `cancel` event). The path is unreachable in practice because `PhotoCarousel` returns `null` when empty, but the component itself provides no failsafe against showing in that state. A `useEffect` or early guard that calls `onClose()` if `photos.length === 0 && open` would make it truly bulletproof.

## Nits

**N1.** `useSwipe.ts` has `import type React from 'react'` but uses `React.PointerEvent` in the type signatures. This is fine (`import type` with named types works), but the comment about the import purpose could be clearer.

**N2.** The `onPointerCancel` handler signature in the contract is `(e: React.PointerEvent) => void` but the implementation at line 76 of `useSwipe.ts` declares it as `() => void` (no argument). The argument is unused and TypeScript accepts this (narrower function is assignable to the wider type when spread), but the implementation signature does not match the exported `SwipeHandlers` interface exactly. This is a minor inconsistency.

**N3.** `PhotoViewer.tsx` has two nearly-identical `<dialog>` JSX blocks (empty-photos path and the normal path) with the same `className` string repeated. Extracting the class string to a constant would reduce duplication.

## Positive Notes

- Axis-lock logic in `useSwipe` is correct: `lockedAxis` is set once on the first `pointermove` that exceeds `slopPx`, using `adx >= ady` to resolve diagonal ties. The lock is never changed mid-gesture. Callbacks fire only on `pointerup`. This is exactly the design spec.
- `setPointerCapture` is wrapped in `try/catch` with a descriptive comment — correct for happy-dom compatibility.
- `usePhotoViewer.openViewer` correctly clamps unknown IDs to index 0 (`idx >= 0 ? idx : 0`).
- `useDialogControl` ref is used; `onDialogClick` is intentionally not spread — comment at line 17 of `PhotoViewer.tsx` makes the deliberate omission explicit and reviewable.
- `"use client"` directive is present on all three new files.
- No `any`, no `@ts-ignore`, no new dependencies.
- `PhotoCarousel.tsx` is untouched at 96 lines.
- All four required `data-testid` selectors are present: `photo-viewer-container`, `photo-viewer-close`, `photo-viewer-img`, `photo-viewer-counter`.
- Korean strings are exact: `aria-label="닫기"`, `` alt={`사진 ${currentIndex + 1}`} ``, `{currentIndex + 1} / {photos.length}` (numeric only, no suffix).
- The two Phase-10 fixes are sound: `{open && (...)}` correctly gates DOM presence (resolving Playwright visibility without display:none ambiguity), and `e.stopPropagation()` on the close button's `onPointerDown` is the standard and non-disruptive fix for setPointerCapture bubbling.
- `<PhotoViewer>` is mounted unconditionally and placed after `<PhotoCarousel>`, before `<Toast>` — per contract invariant 3 and placement spec.
- Both new Editor integration cases (C-viewer-1, C-viewer-2) test the full open-and-close cycle through actual `showModal`/`close` mock counts.

## Invariant Walkthrough

| # | Invariant | Verification | Status |
|---|---|---|---|
| 1 | `usePhotoViewer` and `<PhotoViewer>` receive the same `photos` array (`state.photos`) | Editor.tsx line 36: `usePhotoViewer(state.photos)`, line 197: `photos={state.photos}` — same reference | PASS |
| 2 | `openViewer` only called from `PhotoCarousel`'s `onThumbnailTap` | Editor.tsx line 193: `onThumbnailTap={openViewer}` — sole call site | PASS |
| 3 | `<PhotoViewer>` mounted unconditionally; `open` drives show/hide | Editor.tsx lines 196-201: unconditional mount, no conditional wrapper | PASS |
| 4 | Swipe handlers spread on inner container `<div>`, not on `<dialog>` | PhotoViewer.tsx line 61: `{...swipeHandlers}` on `photo-viewer-container` div, not on `<dialog>` | PASS |
| 5 | `initialIndex` passed to `<PhotoViewer>` equals `viewerInitialIndex` from `usePhotoViewer` | Editor.tsx line 199: `initialIndex={viewerInitialIndex}` | PASS |

## File Size Audit

| File | Target | Actual | Delta | Verdict |
|---|---|---|---|---|
| `useSwipe.ts` | ~50 | 82 | +64% | Over — acceptable, no natural split point |
| `usePhotoViewer.ts` | ~25 | 29 | +16% | Acceptable |
| `PhotoViewer.tsx` | ~80 | 106 | +33% | Over soft cap of 100 — 6 lines from inline SVG and `{open && ...}` fix; acceptable per CLAUDE.md exception |
| `Editor.tsx` | ~255 | 253 | within | PASS |
| `PhotoCarousel.tsx` | ≤96 | 96 | unchanged | PASS |

## Architecture Consistency

The implementation follows all existing patterns:
- `useDialogControl` reused from design-system (same as `BottomSheet`, `ConfirmDialog`, `MoodPickerSheet`)
- Pointer-event handler shape (`onPointerDown/Move/Up/Cancel`) matches `useLongPress.ts`
- `showModal`/`close` prototype mock pattern in tests matches `Editor.test.tsx` and `MoodPickerSheet.test.tsx`
- `makePointerEvent` helper pattern reused from `useLongPress.test.ts`
- `makePhoto()` / `makeDiary()` fixtures reused from existing test fixtures
- `eslint-disable-next-line @next/next/no-img-element` comment matches `PhotoCarousel.tsx` line 52
- Navigation remains modal (not in history stack) per PRD §2.1 and REQ-012 Notes

## Contract Consistency

All interface shapes match the API contract document exactly:
- `SwipeOptions` and `SwipeHandlers` interfaces — exact match
- `usePhotoViewer` return type — exact match
- `PhotoViewerProps` — exact match
- Korean strings — exact match
- Test selector guarantees — all four testids present

One minor implementation-vs-contract discrepancy: `onPointerCancel` in `SwipeHandlers` is typed `(e: React.PointerEvent) => void` in the contract, but the implementation declares it as `() => void`. TypeScript allows this assignment (a function ignoring its argument is assignable to one that expects it), so it compiles cleanly and behaves correctly, but the contract states the handler receives an event. Non-breaking.

## Verdict
PASS

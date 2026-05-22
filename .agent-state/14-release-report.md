# Release Report

## Summary

REQ-012 (사진 전체화면 뷰어) adds a full-screen photo viewer modal to the diary editor. When a user short-taps a `PhotoCarousel` thumbnail, a `<dialog>`-based full-screen viewer opens on a pure-black background. The viewer supports left/right pointer swipe to navigate photos and vertical swipe or the ✕ close button (or ESC) to dismiss. No backend, database, routing, or dependency changes are required. The feature is purely display-only and zero-impact on autosave.

All 13 required gate reports are present and end with PASS, plus both optional reports (11-performance, 12-infra) also PASS. Two production-code defects were found and fixed during Phase 10 verification before all gates passed. 285 unit tests + 7 E2E tests all pass.

## Files Changed

### New source files
- `src/lib/hooks/useSwipe.ts` — pointer-event gesture hook (axis-lock, threshold, setPointerCapture try/catch), 82 lines
- `src/lib/hooks/usePhotoViewer.ts` — open/close/index state hook, 29 lines
- `src/app/diary/[date]/_components/PhotoViewer.tsx` — full-screen `<dialog>` viewer component, 106 lines

### New test files
- `src/lib/hooks/__tests__/useSwipe.test.ts` — 7 unit cases (SW1–SW7)
- `src/lib/hooks/__tests__/usePhotoViewer.test.ts` — 4 unit cases (PV1–PV4)
- `src/app/diary/[date]/__tests__/PhotoViewer.test.tsx` — 7 unit cases (PVC1–PVC7)

### New E2E files
- `e2e/photo-viewer.spec.ts` — 1 spec (PV-E1): tap thumbnail → viewer visible → 닫기 → dismissed

### Modified source files
- `src/app/diary/[date]/_components/Editor.tsx` — added `usePhotoViewer` hook call; wired `onThumbnailTap` to `openViewer`; mounted `<PhotoViewer>` unconditionally (243 → 253 lines)

### Modified test files
- `src/app/diary/[date]/__tests__/Editor.test.tsx` — +2 integration cases (C-viewer-1, C-viewer-2)

### Agent state files
- `.agent-state/00-git-safety.md` through `.agent-state/13-e2e-report.md` — all REQ-012 cycle reports (updated in place)
- `.agent-state/security-report.md` — short-name mirror of 10-security-report.md (updated)
- `.agent-state/requirements/REQ-012.md` — status flipped to DONE
- `.agent-state/requirements/index.md` — REQ-012 row updated to DONE

### Unchanged files (confirmed)
- `src/app/diary/[date]/_components/PhotoCarousel.tsx` — NOT modified (96 lines, budget protected)

## Gate Status

| Gate | Report | Verdict |
|---|---|---|
| Requirement intake | 01-requirement-intake.md | PASS |
| Architecture | 02-architecture-report.md | PASS |
| Technical design | 03-technical-design.md | PASS |
| API contract | 04-api-contract.md | PASS |
| DB / migration | 05-db-migration-report.md | PASS (no schema changes; display-only) |
| Test plan | 06-test-plan.md | PASS |
| Test report | 08-test-report.md | PASS |
| Code review | 09-code-review-report.md | PASS |
| Security review | 10-security-report.md | PASS (3 LOW informational, no required fixes) |
| Performance | 11-performance-report.md | PASS |
| Infra | 12-infra-report.md | PASS |
| E2E | 13-e2e-report.md | PASS |

## Tests Run

- Unit / integration (Vitest): 285 tests across 41 files — all PASS
- TypeScript compile (`tsc --noEmit`): 0 errors — PASS
- ESLint (`npm run lint`): 0 warnings, 0 errors — PASS
- E2E (Playwright, Chromium): 7 specs — all PASS (23 s)

## Review Status

Code review — PASS. No blocking issues. Three non-blocking suggestions deferred: focus-management sequencing comment (NB-1), `useSwipe.ts` size overage acknowledged (NB-2), empty-photos bulletproof guard deferred (NB-3). Two nits (N1–N2 type inconsistency, N3 className duplication) noted but non-blocking. All five required invariants verified PASS.

## Security Status

Security review — PASS. No Critical, High, or Medium issues. Three LOW informational items accepted as residual risk: L-1 (read-time `data:image/` re-validation gap — write-time guard is sufficient for current trust model), L-2 (in-memory base64 retention — pre-existing design choice), L-3 (intentional omission of backdrop-click-to-close). No required fixes.

## E2E Status

7/7 Playwright specs pass (Chromium, Desktop Chrome, port 3001, single worker, 23 s). New spec PV-E1 covers: viewer not visible on load → tap thumbnail → viewer visible → click 닫기 → viewer dismissed. Swipe-left/right navigation covered by unit tests only (pointer-gesture automation deferred as brittle). Vertical-swipe-to-close covered by unit test PVC7. Firefox/WebKit deferred for MVP.

## Performance / Infra Status

Performance — PASS. Zero React re-renders during drag (all gesture state in refs). Image swaps are synchronous attribute mutations against pre-decoded bitmaps (no network fetch). `{open && (...)}` DOM gate keeps closed-viewer cost minimal. Two non-blocking improvement notes deferred: `onSwipeLeft` ref-based stability option and `useEffect` dep array comment for in-place photo mutation edge case.

Infra — PASS. No changes to `package.json`, `.env*`, `playwright.config.ts`, Next.js routes, or server components. All new code is statically bundled client-side.

## Commit Message

```
feat: full-screen photo viewer with swipe (REQ-012)

- Add PhotoViewer dialog, useSwipe gesture hook, and usePhotoViewer state hook
- Wire PhotoCarousel onThumbnailTap to open viewer at the correct index
- Swipe left/right to navigate; swipe up/down or ✕ button to close

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## PR Body

```md
## Summary

- New `PhotoViewer` component: full-screen `<dialog>` over the editor on a pure-black background, showing the tapped photo with `object-fit: contain` and a top-right "N / M" counter
- New `useSwipe` hook: axis-locked pointer-event gesture handling (left/right for navigation, vertical for close), with `setPointerCapture` for reliable out-of-element tracking
- New `usePhotoViewer` hook: open/close/index state management isolated from Editor
- `Editor.tsx` wired: `onThumbnailTap={() => {}}` stub replaced with `openViewer`; `<PhotoViewer>` mounted unconditionally

## Acceptance Criteria

- [x] Short tap on carousel thumbnail opens full-screen viewer at the correct index
- [x] Pure-black background, `object-fit: contain`, `100dvh` height
- [x] Top-right counter label e.g. "2 / 5"
- [x] Swipe left → next photo (bounded at last); swipe right → previous photo (bounded at first)
- [x] Swipe up/down → close viewer
- [x] Top-left ✕ button (44×44 touch target, `aria-label="닫기"`) → close viewer
- [x] ESC key closes (native `<dialog>` cancel event)
- [x] Viewer is a modal — not in browser history stack
- [x] Body scroll locked while viewer open (native `showModal()`)

## Technical Notes

- Two defects found and fixed during verification: (1) `{open && (...)}` render gate required for reliable Playwright visibility detection; (2) `e.stopPropagation()` on close-button `onPointerDown` required to prevent `setPointerCapture` on the swipe container from consuming the click.
- `useDialogControl` reused from design-system (same as BottomSheet, ConfirmDialog, MoodPickerSheet).
- `onDialogClick` intentionally omitted from `<dialog>` spread — prevents accidental close when swipe ends on backdrop.
- `PhotoCarousel.tsx` is untouched (96 lines, budget protected).

## API / Interface Changes

Internal TypeScript contracts only — no network boundary. New interfaces: `SwipeOptions`, `SwipeHandlers` (useSwipe), `UsePhotoViewerReturn` (usePhotoViewer), `PhotoViewerProps` (PhotoViewer). No existing prop signatures changed.

## Data / Migration Notes

No schema changes. Feature is display-only; reads `state.photos` already stored by REQ-011. Zero new `localStorage` keys.

## Tests

285 unit/integration tests (Vitest, 41 files), 0 failures. 7 E2E specs (Playwright, Chromium), 0 failures. TypeScript and ESLint clean.

## Security Review

PASS — no Critical/High/Medium issues. Three LOW informational items accepted (read-time MIME re-validation gap, in-memory base64 retention, intentional no-backdrop-close). No required fixes.

## E2E Evidence

PV-E1: diary entry with 2 pre-seeded photos → viewer not visible on load → tap first thumbnail → viewer visible → click 닫기 → viewer dismissed. All 6 pre-existing specs remain green.

## Risk / Rollback Plan

No server-side changes. Rollback = revert the 3 new files and the Editor.tsx + Editor.test.tsx deltas. Non-blocking deferred items: read-time `data:image/` re-validation guard (security L-1 recommendation), `useSwipe.ts` comment on `onPointerCancel` signature, empty-photos bulletproof guard.
```

## Remaining Risks

1. `PhotoViewer.tsx` at 106 lines is 6 lines over the 100-line soft cap — acceptable per CLAUDE.md exception (inline SVG and `{open && ...}` fix are not candidates for extraction).
2. Read-time `data:image/` re-validation not added to `PhotoViewer` (security L-1 recommendation deferred) — negligible risk given single write path through REQ-011's `addPhotoFromFile` guard.
3. `onPointerCancel` implementation signature `() => void` does not match contract `(e: React.PointerEvent) => void` — TypeScript accepts narrower assignee; no behavioral impact.
4. Swipe-left/right E2E not covered (pointer-gesture automation deferred as brittle); unit tests PVC4–PVC6 provide coverage.
5. Firefox/WebKit E2E coverage deferred for MVP.

## Verdict
PASS

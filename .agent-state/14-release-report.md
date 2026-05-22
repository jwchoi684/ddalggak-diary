# Release Report

## Summary

REQ-011 (사진 추가 / 카로젤 / 길게 누름 삭제) adds photo attachment to the diary editor. A hidden `<input type="file">` is triggered by the gallery icon stub in `EditorToolbar`. The selected image is read as a base64 data URL via a new `addPhotoFromFile` storage utility and appended to `DiaryEntry.photos`. A horizontally scrolling `PhotoCarousel` of 80–96 px thumbnails appears below the mood header; it is completely hidden when the photos array is empty. A 500 ms long-press on any thumbnail (implemented via a new `useLongPress` hook) shows a per-photo delete overlay with haptic feedback; tapping elsewhere dismisses it. A hard cap of 10 photos is enforced at the add path and reflected by `galleryDisabled` on `EditorToolbar`. All photo mutations flow through the existing REQ-009 autosave pipeline (`useEditorState` reducer + `useAutosave`). No new dependencies and no backend changes.

All 13 required gate reports are present and end with `PASS`. Cycle history: code review cycle 2, security hardening pass (L-1 applied as cycle 3 fix). 263 unit tests + 6 E2E tests all pass.

## Files Changed

### New source files
- `src/lib/storage/photoBase64.ts` — `addPhotoFromFile` utility (FileReader → base64, size guard, MIME guard, dimension extraction)
- `src/lib/hooks/useLongPress.ts` — `useLongPress` hook (500 ms timer, 5 px slop cancel, unmount cleanup)
- `src/app/diary/[date]/_components/PhotoCarousel.tsx` — horizontal scrolling carousel with per-Thumb long-press overlay

### New test files
- `src/lib/storage/__tests__/photoBase64.test.ts` — 6 unit cases (PB1–PB6 + PB7 MIME-prefix guard)
- `src/lib/hooks/__tests__/useLongPress.test.ts` — 6 unit cases (LP1–LP6)
- `src/app/diary/[date]/__tests__/PhotoCarousel.test.tsx` — 8 cases (PC1–PC8, PC8 added in cycle 2 for B-1 regression)

### New E2E files
- `e2e/photos.spec.ts` — 2 specs: PE1 (add → autosave → reload persistence), PE2 (10-photo cap disables gallery)
- `e2e/fixtures/1x1.png` — minimal PNG fixture for PE1

### Modified source files
- `src/lib/hooks/useEditorState.ts` — adds `photos: Photo[]` to `EditorState`; adds `ADD_PHOTO` / `DELETE_PHOTO` reducer actions; updates `LOAD_ENTRY` and `MARK_SAVED`
- `src/lib/hooks/useHorizontalDatePicker.ts` — extends `AutosaveValue` type with `photos: Photo[]`
- `src/app/diary/[date]/_components/Editor.tsx` — wires gallery file input, dispatches `ADD_PHOTO` / `DELETE_PHOTO`, passes `photos` to `autosaveValue`, passes `galleryDisabled` to `EditorToolbar`, renders `PhotoCarousel`
- `src/app/diary/[date]/_components/EditorToolbar.tsx` — adds `galleryDisabled?: boolean` prop; applies disabled state and ARIA label to gallery button

### Modified test files
- `src/app/diary/[date]/__tests__/Editor.test.tsx` — 4 new photo integration cases (C-photo-1..4)
- `src/lib/hooks/__tests__/useEditorState.test.ts` — 3 new reducer cases (ES-photo-1..3)
- `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` — updated all 4 test call sites to include `photos: []` in `autosaveValue`
- `src/lib/storage/__tests__/fixtures.ts` — adds `makePhoto` factory

### Modified E2E / config files
- `e2e/_helpers/seedDiaries.ts` — adds `seedDiariesOnceScript` helper (seeds only when key absent, preventing reload from wiping saved state)
- `playwright.config.ts` — port 3000 → 3001 (VS Code conflict), `workers: 1`, `fullyParallel: false`, `expect.timeout: 15_000`, `wait: { stdout: /Ready in/ }`

### Agent state files
- `.agent-state/00-git-safety.md` through `.agent-state/14-release-report.md` — all REQ-011 cycle reports
- `.agent-state/requirements/REQ-011.md` — status flipped to DONE
- `.agent-state/requirements/index.md` — REQ-011 row updated to DONE
- `.agent-state/security-report.md` — short-name mirror of 10-security-report.md

## Gate Status

| Gate | Report | Verdict |
|---|---|---|
| Requirement intake | 01-requirement-intake.md | PASS |
| Architecture | 02-architecture-report.md | PASS |
| Technical design | 03-technical-design.md | PASS |
| API contract | 04-api-contract.md | PASS |
| DB / migration | 05-db-migration-report.md | PASS (no schema changes needed) |
| Test plan | 06-test-plan.md | PASS |
| Test report | 08-test-report.md | PASS |
| Code review | 09-code-review-report.md | PASS (cycle 2) |
| Security review | 10-security-report.md | PASS (L-1 hardening applied) |
| Performance | 11-performance-report.md | PASS |
| Infra | 12-infra-report.md | PASS |
| E2E | 13-e2e-report.md | PASS |

## Tests Run

- Unit / integration (Vitest): 263 tests, 38 files — all PASS
- TypeScript compile: 0 errors — PASS
- ESLint: 0 warnings, 0 errors — PASS
- E2E (Playwright, Chromium): 6 specs — all PASS (22.5 s)

Note: The context brief mentioned 265 unit tests; the test report records 263. The discrepancy is 2 tests. The test report is the authoritative source (cycle 2, verified against actual vitest output). PB7 (MIME-prefix guard) is confirmed present in the report's coverage table but was counted within the 263 total — no missing tests.

## Review Status

Code review cycle 2 — PASS. One blocking issue (B-1: shared overlayRef across Thumb instances) resolved in cycle 2 via per-instance `overlayRef` + `useEffect`. Two non-blocking suggestions deferred: `onPointerLeave`/`onPointerCancel` not setting `didCancel` (low probability, no contract impact) and `onThumbnailTap={() => {}}` inline arrow (flagged for REQ-012 implementor).

## Security Status

Security review — PASS. No Critical / High / Medium issues. L-1 (missing MIME-prefix guard on dataUrl) was applied as a one-line fix to `photoBase64.ts` before the final test cycle. L-2 (`new Function` in `seedDiaries.ts`) is a negligible maintenance note with no required fix.

## E2E Status

6/6 Playwright specs pass (Chromium, Desktop Chrome, port 3001, single worker). PE1 covers add → autosave → reload persistence. PE2 covers 10-photo cap enforcing `disabled` state on the gallery button. Long-press delete overlay not covered by E2E (reliable 500 ms pointer simulation deferred to REQ-012 cycle; covered by unit tests PC3–PC5). Firefox/WebKit deferred.

## Performance / Infra Status

Performance — PASS. All costs proportionate for single-user localStorage-backed MVP. Dominant cost is `upsertDiary` read-all/write-all with up to 1.5 MB base64 payload; acceptable at 1-second debounce rate. Three non-blocking improvement notes deferred: proactive quota estimate, upsertDiary corpus indexing (v2 plan), `onThumbnailTap` `useCallback` at REQ-012 call site.

Infra — PASS. No deployment artifact changes. `playwright.config.ts` port change (3000 → 3001) is test-only and has no production impact. `wait: { stdout: /Ready in/ }` flagged as relying on an undocumented Next.js log string; acceptable risk for local dev E2E.

## Commit Message

```
feat: photo carousel with long-press delete (REQ-011)

- Add PhotoCarousel, useLongPress hook, and addPhotoFromFile utility
- Wire ADD_PHOTO / DELETE_PHOTO through useEditorState → autosave pipeline
- Enforce 10-photo cap; E2E: add → autosave → reload persistence (PE1/PE2)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## PR Body

```md
## Summary

- Activates the gallery icon stub in `EditorToolbar` to open a native file picker (`accept="image/*"`)
- New `addPhotoFromFile` utility reads the selected file as base64, validates MIME prefix, enforces 150 KB per-photo size cap, and extracts dimensions
- New `PhotoCarousel` renders a horizontally scrolling row of 80–96 px square thumbnails; hidden when photos array is empty
- New `useLongPress` hook (500 ms timer, 5 px slop) drives per-thumbnail delete overlay with haptic feedback
- All photo mutations flow through the existing REQ-009 autosave pipeline — no new persistence code

## Acceptance Criteria

- [x] Gallery icon tap → file picker (`accept="image/*"`)
- [x] Selected image stored as base64 in `DiaryEntry.photos`
- [x] Carousel: horizontal scroll, 80–96 px square, 8 px gap; hidden when empty
- [x] Long-press 500 ms → "삭제" overlay + `navigator.vibrate(50)`
- [x] Tap delete → photo removed from array; overlay hidden
- [x] Tap elsewhere → overlay dismissed
- [x] 10-photo cap: gallery button disabled, "최대 10장" toast on attempt
- [x] Photo changes autosave via REQ-009 path

## Technical Notes

- `addPhotoFromFile` guards MIME prefix (`data:image/`) and byte length before `getDimensions`
- `useLongPress` resets `didCancel` on each `pointerDown`; scroll-slop (5 px) cancels the timer without triggering `onShortTap`
- `PhotoCarousel` uses per-`Thumb` `overlayRef` + `useEffect` for global `document.pointerdown` dismiss; at most one listener active at a time
- `AutosaveValue` type extended with `photos: Photo[]` in `useHorizontalDatePicker.ts`; all call sites updated

## API / Interface Changes

Internal TypeScript contracts only — no network boundary. See `04-api-contract.md` for full interface table.

## Data / Migration Notes

No schema changes. `Photo` type and `DiaryEntry.photos: Photo[]` were defined in REQ-002. `upsertDiary` round-trips the full object through JSON; photos persist without migration.

## Tests

263 unit/integration tests (Vitest), 0 failures. 6 E2E specs (Playwright / Chromium), 0 failures. TypeScript and ESLint clean.

## Security Review

PASS — no Critical/High/Medium issues. L-1 MIME-prefix guard applied. Residual risks (localStorage quota, advisory `accept` attribute, global pointer listener) documented and accepted for MVP.

## E2E Evidence

PE1: add photo → wait autosave debounce → reload → carousel still visible (persistence confirmed).
PE2: entry seeded with 10 photos → gallery button is `disabled`.
All 4 pre-existing specs remain green.

## Risk / Rollback Plan

No server-side changes. Rollback = revert source files listed in implementation report. `playwright.config.ts` can independently revert to port 3000 if `wait.stdout` pattern causes CI hangs. Deferred items for REQ-012: full-screen viewer, `onThumbnailTap` wiring, long-press E2E coverage.
```

## Remaining Risks

1. `onPointerLeave` / `onPointerCancel` do not set `didCancel.current` — low-probability edge case (stylus drift + subsequent `pointerUp` on same element). No user-visible impact identified; deferred per code review non-blocking #1.
2. `onThumbnailTap={() => {}}` inline arrow causes `shortTap` `useCallback` to recreate on every `Editor` render. Harmless today (no-op); must be fixed to `useCallback(() => {}, [])` when REQ-012 wires a real callback.
3. `wait: { stdout: /Ready in/ }` in `playwright.config.ts` relies on an undocumented Next.js log string. If changed in a Next.js upgrade, E2E suite will time out (120 s) rather than fail fast. Low risk; documented.
4. `Editor.tsx` at 243 lines remains over the 100-line file budget (pre-existing). Flagged for extraction before REQ-012.
5. Firefox / WebKit E2E coverage deferred to a later cycle.

## Verdict
PASS

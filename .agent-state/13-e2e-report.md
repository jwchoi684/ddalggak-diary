# E2E Report — REQ-012: 사진 뷰어 (Photo Viewer)

## Summary

7 of 7 Playwright specs passed in 23 s (Chromium). The new spec `e2e/photo-viewer.spec.ts` (PV-E1) passed, and all 6 pre-existing specs remain green. The Phase 10 patch to `PhotoViewer.tsx` (`{open && ...}` render gate + `stopPropagation` on close button `onPointerDown`) was required to make PV-E1 reliable.

## Scenario Tested

**REQ-012 — Full-screen Photo Viewer on the Diary Editor**

PV-E1: A user opens a diary entry that has 2 photos pre-seeded in localStorage. The viewer is not visible on load. The user taps the first thumbnail; the full-screen viewer image becomes visible. The user clicks `닫기`; the viewer is dismissed.

## Steps

1. `page.addInitScript(seedDiariesScript([entry]))` seeds a `DiaryEntry` for `2026-05-01` with two 1x1 PNG data-URLs into localStorage before navigation.
2. `page.goto('/diary/2026-05-01')` opens the editor for that date.
3. Assert `photo-viewer-img` is **not visible** (viewer starts closed).
4. Click `photo-thumb-e2e-photo-1` (first thumbnail).
5. Assert `photo-viewer-img` **is visible** (viewer opened).
6. Click button with accessible name `닫기`.
7. Assert `photo-viewer-img` is **not visible** (viewer dismissed).

## Test Files Added / Updated

- `e2e/photo-viewer.spec.ts` — 1 case (PV-E1), added during REQ-012 implementation.

## Commands Run

```
npm run test:e2e   →   playwright test (7 specs)
```

Dev server starts automatically on port 3001 via Playwright `webServer` config.

## Results

| # | File | Test | Result | Duration |
|---|---|---|---|---|
| 1 | calendar.spec.ts | 캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동 | PASS | 5.0 s |
| 2 | editor.spec.ts | 캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시 | PASS | 2.9 s |
| 3 | horizontal-date-picker.spec.ts | E1: switch date A→B, URL stays at A | PASS | 2.4 s |
| 4 | horizontal-date-picker.spec.ts | E2: no-mood date switch, no partial persist | PASS | 1.6 s |
| 5 | photo-viewer.spec.ts | **PV-E1: tap thumbnail → viewer → 닫기 → dismissed** | **PASS** | 1.2 s |
| 6 | photos.spec.ts | PE1: 사진 추가 → 자동 저장 → 재진입 시 카로젤 보존 | PASS | 3.3 s |
| 7 | photos.spec.ts | PE2: 10장이면 갤러리 버튼 disabled | PASS | 1.2 s |

**Total: 7 passed, 0 failed — 23 s**

Browser: Chromium (Desktop Chrome). Config: `playwright.config.ts`, port 3001, `next dev --port 3001`, `workers: 1`, `fullyParallel: false`, `expect.timeout: 15 000 ms`.

## Failures

None.

## Screenshots / Artifacts

No failures occurred. `trace: 'on-first-retry'` is configured; no traces were produced.

## Not Tested

- Swipe-left/right to navigate between photos in the viewer — covered by unit tests (PVC4–PVC6); pointer-gesture automation in Playwright is brittle for this pattern and unit coverage is sufficient.
- Vertical-swipe-to-close — covered by unit test PVC7.
- Pinch-zoom — explicitly out of scope (REQ-012 Non-Goals, v2).
- Firefox / WebKit — single-browser (Chromium) coverage intentional for MVP; deferred.

## Verdict
PASS

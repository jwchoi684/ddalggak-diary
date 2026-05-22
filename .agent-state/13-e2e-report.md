# E2E Report

## Summary

REQ-013 (List Screen) E2E journey is verified. Spec `e2e/list.spec.ts` (LE1) was added during Phase 10 and passed alongside all 7 pre-existing Playwright specs. Total: 8/8 PASS.

## Scenario Tested

LE1 — List screen entry navigation. Seed 2 diary entries into localStorage → navigate to `/list` → assert 2 cards visible → tap the first card (newest-first order) → assert URL transitions to `/diary/<date>` and the editor textarea is visible.

## Steps

1. `page.addInitScript(seedDiariesScript([e1, e2]))` injects two `DiaryEntry` objects (`e1` on day 10, `e2` on day 20, current month) into localStorage before navigation.
2. `page.goto('/list')` opens the list screen.
3. Query all buttons with accessible name `/일기 보기/` — assert count is 2.
4. Click `cards.first()` (newest-first order = `e2` on day 20).
5. Assert `page.url()` matches `/diary/`.
6. Assert `getByPlaceholder('오늘 어떤 하루였나요?')` is visible.

## Test Files Added / Updated

| File | Case | Status |
|---|---|---|
| `e2e/list.spec.ts` | LE1 | Added (Phase 10) |

## Commands Run

```
npm run test:e2e   →  8/8 PASS (24.8 s, Chromium)
```

Dev server starts automatically on port 3001 via Playwright `webServer` config.

## Results

| Spec | Tests | Result |
|---|---|---|
| `e2e/calendar.spec.ts` | 1 | PASS |
| `e2e/editor.spec.ts` | 1 | PASS |
| `e2e/horizontal-date-picker.spec.ts` | 2 | PASS |
| `e2e/list.spec.ts` | 1 | PASS |
| `e2e/photo-viewer.spec.ts` | 1 | PASS |
| `e2e/photos.spec.ts` | 2 | PASS |
| **Total** | **8** | **8/8 PASS** |

## Failures

None.

## Screenshots / Artifacts

No failures occurred. `trace: 'on-first-retry'` is configured; no traces were produced.

## Not Tested

- Safari / Firefox browsers — Chromium only in CI; deferred for MVP.
- Sort-order toggle — not implemented in REQ-013.
- Scroll-position restoration when returning from editor to list — covered at unit level via `ListScreen` state tests.

## Verdict
PASS

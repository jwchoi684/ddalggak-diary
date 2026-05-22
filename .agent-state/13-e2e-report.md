# E2E Report — REQ-011: 사진 첨부 (Photo Attachment)

## Summary

6 of 6 Playwright specs passed in 22.5 s (Chromium, Desktop Chrome). The two new specs for REQ-011 (`photos.spec.ts` PE1 and PE2) both passed, and all 4 pre-existing specs remain green. The L-1 security-hardening pass (MIME-prefix guard added to `photoBase64.ts`) does not affect happy-path E2E flows because `FileReader.readAsDataURL` always produces a `data:image/...` prefix for valid image files.

## Scenario Tested

**REQ-011 — Photo Attachment on the Diary Editor**

PE1: A user opens a diary entry with no photos, uploads a 1x1 PNG via the gallery icon, sees the carousel appear with one thumbnail, waits for the autosave debounce, reloads the page, and confirms the carousel and thumbnail are still present (persistence through `localStorage` autosave path).

PE2: A user opens a diary entry that already has 10 photos seeded in localStorage; the gallery icon button must be in a `disabled` state, enforcing the hard 10-photo cap.

## Steps

**PE1 — add photo → autosave → reload persistence**
1. Seed localStorage via `seedDiariesOnceScript` with a base entry (no photos) for `2026-05-15`.
2. Navigate to `/diary/2026-05-15`; assert `[data-testid="photo-carousel"]` has count 0.
3. Call `page.setInputFiles('input[type="file"]', '1x1.png')` to simulate gallery selection.
4. Assert `[data-testid="photo-carousel"]` is visible and `[data-testid^="photo-thumb-"]` has count 1.
5. Wait 1 500 ms (autosave debounce is 1 000 ms + buffer).
6. `page.reload()` — `seedDiariesOnceScript` does NOT re-seed because the key already exists.
7. Assert carousel is still visible and thumbnail count is still 1.

**PE2 — 10-photo cap disables gallery button**
1. Seed localStorage via `seedDiariesScript` with an entry containing 10 pre-built `Photo` objects for `2026-05-16`.
2. Navigate to `/diary/2026-05-16`.
3. Assert `page.getByRole('button', { name: '갤러리' })` is disabled.

## Test Files Added / Updated

- `e2e/photos.spec.ts` — 2 cases PE1 + PE2 (added during REQ-011 cycle 2; unchanged in L-1 hardening pass)
- `e2e/_helpers/seedDiaries.ts` — `seedDiariesOnceScript` helper (added during REQ-011 cycle-1 fix; unchanged in L-1 pass)

## Commands Run

```
npm run test:e2e   →   playwright test (6 specs)
```

## Results

| # | File | Test | Result | Duration |
|---|---|---|---|---|
| 1 | calendar.spec.ts | 캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동 | PASS | 5.4 s |
| 2 | editor.spec.ts | 캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시 | PASS | 3.5 s |
| 3 | horizontal-date-picker.spec.ts | E1: switch date A → B, URL stays at A | PASS | 1.4 s |
| 4 | horizontal-date-picker.spec.ts | E2: no-mood date switch, no partial persist | PASS | 1.5 s |
| 5 | photos.spec.ts | PE1: 사진 추가 → 자동 저장 → 재진입 시 카로젤 보존 | PASS | 3.9 s |
| 6 | photos.spec.ts | PE2: 10장이면 갤러리 버튼 disabled | PASS | 0.8 s |

**Total: 6 passed, 0 failed — 22.5 s**

Browser: Chromium (Desktop Chrome). Config: `playwright.config.ts`, port 3001, `next dev --port 3001`, `workers: 1`, `fullyParallel: false`, `expect.timeout: 15 000 ms`.

## Failures

None.

## Screenshots / Artifacts

No failures occurred. `trace: 'on-first-retry'` is configured; no traces were produced.

## Not Tested

- Long-press delete overlay via Playwright pointer events — reliable 500 ms hold simulation deferred to REQ-012 cycle.
- Firefox / WebKit — single-browser (Chromium) coverage intentional for MVP; deferred.
- Storage-quota exhaustion path — requires injecting a near-limit localStorage mock; deferred.
- MIME-prefix rejection path (L-1 guard) — covered by unit test PB7 in `src/lib/storage/__tests__/photoBase64.test.ts`; no E2E equivalent required as the guard is a synchronous JS check with no browser-rendering dependency.

## Verdict
PASS

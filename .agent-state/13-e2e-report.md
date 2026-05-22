# E2E Report — REQ-009: 일기 에디터

## Summary

REQ-009 diary editor E2E suite verified against the current codebase. Both Playwright tests (calendar navigation + editor journey) passed cleanly in 17.9 s with no retries. The `editor.spec.ts` file was written during Phase 9 (test-engineer) and is confirmed green here.

## Scenario Tested

**Core user journey:** User opens the calendar, taps the FAB to enter today's editor, sees the mood picker auto-open, selects a mood (기쁨), types diary text, waits for the 1-second autosave to fire, taps the back button to return to the calendar, and confirms the calendar cell for today now shows a mood emoji rather than a plain date number.

## Steps

1. Navigate to `/` (calendar screen).
2. Tap `오늘 일기 쓰기` FAB — router navigates to `/diary/YYYY-MM-DD`.
3. Assert `MoodPickerSheet` heading `오늘은 어떤 하루였나요?` is visible (auto-open on empty entry).
4. Click `기쁨` mood button — sheet closes.
5. Assert textarea placeholder `오늘 어떤 하루였나요?` is visible.
6. Fill textarea with `E2E 테스트 일기`.
7. Wait 1500 ms (autosave debounce = 1000 ms + 500 ms buffer).
8. Click `뒤로가기` button — expect URL to return to `/`.
9. Find today's calendar button by date string regex — assert text content is non-empty and not a bare digit string (confirms mood emoji rendered).

## Test Files Added / Updated

- `/Users/jay/Documents/Projects/ai_diary/e2e/editor.spec.ts` — 1 Playwright test (written in Phase 9; no changes made in this phase)
- `/Users/jay/Documents/Projects/ai_diary/e2e/_helpers/seedDiaries.ts` — localStorage seed utility used by tests (no changes made in this phase)

The existing `e2e/calendar.spec.ts` (FAB navigation test from REQ-007) also runs in this suite and passes; it was not modified.

## Commands Run

```
npx playwright install chromium
npm run test:e2e
```

## Results

```
Running 2 tests using 2 workers

  ✓  2 [chromium] › e2e/calendar.spec.ts:3:5 › 캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동 (2.4s)
  ✓  1 [chromium] › e2e/editor.spec.ts:3:5 › 캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시 (4.2s)

  2 passed (17.9s)
```

Browser: Chromium (Desktop Chrome profile), Playwright 1.60.0.
Dev server: `npm run dev` on `http://localhost:3000` (reused if already running per `reuseExistingServer: true`).
Spec config: `playwright.config.ts` — `testDir: ./e2e`, `timeout: 30_000`, Chromium only, `fullyParallel: false`.

## Failures

None.

## Screenshots / Artifacts

No failures occurred. `trace: 'on-first-retry'` is configured; no traces were produced.

## Not Tested

- **Existing-entry re-open persistence (E2E):** Covered by integration tests (Cases C2, C3) but not by a dedicated E2E flow. Omitted to keep E2E scope narrow.
- **Delete flow (E2E):** Covered by integration test (Case C10); not duplicated in E2E.
- **Unsaved-changes guard (E2E):** Covered by integration tests (Cases C8, C9); not duplicated in E2E.
- **Mobile viewport:** Config uses `Desktop Chrome`. Mobile-first layout is validated by unit tests; no mobile Playwright project is configured.

## Verdict
PASS

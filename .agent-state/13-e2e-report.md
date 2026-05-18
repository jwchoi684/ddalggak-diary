# E2E Report — REQ-008: 무드 선택 바텀시트 모달

## Summary

REQ-008 delivers `MoodPickerSheet`, a reusable client component. The component has no route, no page mount, and no caller in the current app. There is no user-reachable journey that surfaces the sheet today. Accordingly, REQ-008-specific E2E coverage is not applicable for this phase.

The existing E2E baseline (`e2e/calendar.spec.ts`, established in REQ-007) was re-run to confirm it remains green. Result: 1/1 PASS (3.1s, Chromium).

---

## Why E2E Is Not Applicable for REQ-008

`MoodPickerSheet` is a composite design-system component. It can only be reached through a screen that mounts it with a controlling `open` state. The first and only planned caller is the diary editor (REQ-009), which is not yet implemented.

The REQ-008 requirement card explicitly states the relevant E2E scenario as:

> "캘린더 빈 셀 → 에디터 → 모달 자동 → 무드 선택 → 본문 작성으로 이어지는 흐름의 일부"

This flow requires:

1. A calendar cell tap that navigates to `/diary/[date]` — this works today (covered by the FAB test in `calendar.spec.ts`).
2. The `/diary/[date]` editor screen to mount `MoodPickerSheet` and open it automatically — REQ-009 is not yet implemented, so the route renders a stub page that does not render the sheet.
3. The user selecting a mood and being returned to the editor body — depends on step 2.

Steps 2 and 3 are blocked by the absence of REQ-009. No browser automation can reach the sheet by clicking through the app as a real user. A Playwright test written today would immediately fail because `role=dialog` with mood buttons is never present in the DOM.

Unit tests fully cover the component in isolation: all 10 specified test cases pass across 191/191 tests in the Vitest suite. The unit surface covers both `mode='initial'` and `mode='change'` close paths, all 10 mood tap callbacks, inactive-tab toast, selected-mood highlight, and the `"use client"` source guard.

---

## Existing E2E Baseline Status

File: `e2e/calendar.spec.ts`
Test: `캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동`

Command run:

```
npx playwright test --reporter=list
```

Output:

```
Running 1 test using 1 worker

  ✓  1 [chromium] › e2e/calendar.spec.ts:3:5 › 캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동 (3.1s)

  1 passed (14.5s)
```

Exit code: 0. No regressions. The REQ-007 calendar baseline is unaffected by REQ-008 (which added only two new files with no modifications to existing source).

The webServer (`npm run dev` on `http://localhost:3000`) started automatically via Playwright's `webServer` config (`reuseExistingServer: true`). Chromium binaries were already installed.

---

## Deferred E2E Coverage (handed to REQ-009)

The following E2E case must be authored by REQ-009 once the editor screen and its `MoodPickerSheet` integration exist:

**Scenario: 빈 날짜 셀 탭 → 무드 선택 → 에디터 본문 입력 대기**

Steps:
1. Navigate to `/` (calendar screen).
2. Tap an empty calendar cell (a date without a diary entry).
3. Assert navigation to `/diary/[date]`.
4. Assert `role=dialog` is visible (mood picker sheet auto-opened).
5. Assert 10 mood buttons are present (query by Korean mood labels, e.g. `기쁨`, `슬픔`).
6. Click a mood button (e.g. `기쁨`).
7. Assert the dialog is dismissed (no longer visible).
8. Assert focus returns to the editor and the body textarea is available.

Suggested file: `e2e/editor.spec.ts`

Additional coverage to layer in with REQ-009:
- `mode='change'` path: tap the mood icon in the editor header → sheet opens → select different mood → sheet closes, editor retains original mood until new one saved.
- Dismiss-without-select: X button in `mode='initial'` → sheet closes → navigate back to calendar (editor leaves without saving).

---

## Test Files Added / Updated

None. No E2E files were added or modified for REQ-008. `e2e/calendar.spec.ts` is unchanged.

---

## Commands Run

```
npx playwright test --reporter=list
```

---

## Results

| Test | Status | Duration |
|---|---|---|
| `캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동` | PASS | 3.1s |

Total: 1/1 passed (14.5s wall time including webServer startup).

---

## Failures

None.

---

## Screenshots / Artifacts

No screenshots captured. `trace: 'on-first-retry'` is configured in `playwright.config.ts`; no failures occurred so no traces were produced.

---

## Not Tested

| Journey | Reason | Deferred To |
|---|---|---|
| 빈 날짜 셀 → 에디터 → MoodPickerSheet 자동 열림 | REQ-009 (editor screen) not yet implemented | REQ-009 |
| 무드 탭 → sheet 닫힘 → 에디터 복귀 | Same — requires editor caller | REQ-009 |
| X 버튼 (initial mode) → sheet 닫힘 → 에디터 뒤로 이동 | Same | REQ-009 |
| 기분 변경 경로 (change mode) | Same | REQ-009 |
| 비활성 탭 탭 → "곧 만나요!" 토스트 표시 | Toast inside dialog; requires editor mount | REQ-009 |

All of the above are covered at the unit level by `MoodPickerSheet.test.tsx` (191/191 tests pass).

---

## Verdict

PASS — not applicable

REQ-008 E2E coverage is deferred to REQ-009 by design. The component has no reachable user journey today. The existing E2E baseline (`e2e/calendar.spec.ts`) passes without regressions.

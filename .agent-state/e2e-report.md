# E2E Report — REQ-007

## Summary

1 spec, 1 test case. Independently re-run against the live dev server. 1/1 PASS (2.9s, Chromium). The spec covers the REQ-007 acceptance criterion "E2E: 권장 — 앱 열기 → 오늘 일기 쓰기 시작" using FAB as the trigger entry point.

---

## Scenario Tested

**Golden path: app open → calendar visible → FAB tap → `/diary/[today]`**

User opens the app at `/`, sees the current month label, confirms the `<main>` landmark is rendered, clicks the FAB labeled `오늘 일기 쓰기`, and lands on the today diary editor route (`/diary/YYYY-MM-DD`).

---

## Steps

1. Navigate to `http://localhost:3000/` (webServer boots via `npm run dev`).
2. Assert `{month}월` text is visible (e.g. `5월` for May).
3. Assert `role=main` is visible.
4. Click `role=button, name="오늘 일기 쓰기"` (the FAB).
5. Assert URL equals `/diary/2026-05-18` (today in YYYY-MM-DD local format).

---

## Test Files Added / Updated

| File | Status | Cases |
|---|---|---|
| `e2e/calendar.spec.ts` | Added in REQ-007 | 1 |

No changes were made during this E2E validation pass. The file is confirmed correct as-is.

---

## Commands Run

```
npm run test:e2e
```

Exit code: 0. Output: `1 passed (9.7s)`.

---

## Spec Quality Verification

### Query strategy — no `data-testid`

The spec uses exclusively role/text/aria-label queries:
- `page.getByText(monthLabel)` — visible text match on `{month}월`
- `page.getByRole('main')` — semantic landmark
- `page.getByRole('button', { name: '오늘 일기 쓰기' })` — button ARIA name

No `data-testid`, CSS selectors, or fragile XPath used. Aligns with Playwright best-practice accessible queries.

### Date computation alignment

The spec computes today using `new Date()` with plain JS:
```ts
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
// → `/diary/2026-05-18`
```

The production `CalendarScreen` derives `today` via:
```ts
new Date().toLocaleDateString('sv')  // → "YYYY-MM-DD" in local TZ
```

Both use the same local timezone. Both produce `YYYY-MM-DD` zero-padded format. The computed strings are identical as long as test runner and Next.js server share the same TZ — which they do (same machine process). No TZ skew risk.

The month label comparison `${today.getMonth() + 1}월` in the spec matches what `CalendarHeader` renders from its 0-based `month` prop `(month + 1)월`. Consistent.

---

## Acceptance Criterion Mapping

| REQ-007 Criterion | Covered by E2E | Method |
|---|---|---|
| 헤더 우측 3개 아이콘 렌더 | No (unit-covered in `CalendarHeader.test.tsx`) | — |
| 월 표시 "{M}월" | Yes | `getByText(monthLabel)` |
| `<main>` landmark visible | Yes | `getByRole('main')` |
| FAB 탭 → 오늘 에디터 | Yes | click + `toHaveURL` |
| 빈 날짜 탭 → 에디터 + 모달 자동 열림 | No (REQ-008/009 scope) | — |
| 일기 있는 날짜 탭 → 에디터 (모달 없음) | No (REQ-009 scope) | — |
| MoodIcon vs 숫자 셀 렌더 | No (unit-covered in `CalendarDayCell.test.tsx`, `CalendarGrid.test.tsx`) | — |

The FAB trigger is a valid substitute for "오늘 셀 탭" (both call `onFAB`/`onCellTap(today)` → same route). FAB is the more reliable selector because it is always present at fixed position regardless of mood state on today's cell.

---

## Not Covered in REQ-007 E2E (deferred)

The following are intentionally excluded from this first E2E spec. Each has unit-test coverage and is tracked for future E2E expansion per REQ scope.

| Journey | Deferred To | Unit Coverage |
|---|---|---|
| Cell tap on empty date → editor + mood picker modal auto-open | REQ-008 / REQ-009 | `CalendarScreen.test.tsx` FAB routing; modal flag in REQ-009 |
| Cell tap on filled date → editor (no modal) | REQ-009 | `CalendarDayCell.test.tsx` onTap case |
| Month nav prev/next arrows | REQ-007 unit | `CalendarScreen.test.tsx` prevMonth/nextMonth |
| Month nav left/right swipe | REQ-007 unit | `CalendarScreen.test.tsx` pointer events |
| Header icon routing to /list /stats /chat | REQ-013 / REQ-014 / REQ-015 | `CalendarHeader.test.tsx` (callback presence) |
| Back-navigation state preservation (scroll, month, sort) | REQ-013+ | Deferred to those REQs |

---

## E2E Test Bootstrap Health

| Property | Value |
|---|---|
| Playwright version | `^1.44.0` (devDependencies) |
| `testDir` | `./e2e` |
| Browsers | Chromium only (Desktop Chrome) |
| `webServer.command` | `npm run dev` |
| `webServer.url` | `http://localhost:3000` |
| `webServer.reuseExistingServer` | `true` (local), `false` (CI) |
| `webServer.timeout` | 120 000ms |
| Test timeout | 30 000ms |
| CI retries | 1 |
| Local retries | 0 |
| `vitest.config.ts` excludes `e2e/**` | Confirmed (line 9) |
| Chromium binaries installed | Confirmed (test ran without install step) |

---

## Hand-off to Future REQs

| Future REQ | Suggested E2E case to add |
|---|---|
| REQ-008 (mood picker) | `빈 날짜 셀 탭 → 무드 선택 모달 자동 열림` — assert `role=dialog` with mood buttons visible |
| REQ-009 (editor) | `무드 선택 → 텍스트 입력 → 저장 → 캘린더 복귀 후 셀에 MoodIcon` — full write flow |
| REQ-013 (list) | `헤더 리스트 아이콘 탭 → /list 화면 → 일기 카드 탭 → 에디터 → 뒤로 가기 → /list 스크롤 복원` |
| REQ-014 (stats) | `헤더 통계 아이콘 탭 → /stats 화면` — chart visible |
| REQ-015/018 (chat) | `AI chat 페르소나 선택 → 메시지 → cited diary chip 탭 → /diary/[date]` |

All new specs should be added to `e2e/` alongside `calendar.spec.ts`. Filename convention: `{feature}.spec.ts`.

---

## Failures

None.

---

## Screenshots / Artifacts

No screenshots captured. `trace: 'on-first-retry'` is configured — traces are generated automatically on CI failure. No failures occurred, so no traces were produced.

---

## Verdict
PASS

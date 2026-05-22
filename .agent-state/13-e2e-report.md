# E2E Report — REQ-010: 가로 날짜 피커 (Horizontal Date Picker)

## Summary

4 of 4 Playwright specs passed in 13.0s (Chromium, Desktop Chrome). The two new specs for REQ-010 (`horizontal-date-picker.spec.ts`) both passed, confirming the core date-switch user journey is correct and regression-free against the full existing suite.

## Scenario Tested

**REQ-010 — Horizontal Date Picker on the Diary Editor**

A user on the diary editor taps the "날짜 선택" button to reveal a horizontal date strip, taps a different date cell, and the editor content switches to that date without navigating away or corrupting the original entry.

## Steps

**E1 — date switch with both entries seeded**
1. Seed localStorage with entries for DATE_A (yesterday) and DATE_B (today).
2. Navigate to `/diary/DATE_A`; assert textarea shows "Entry A text".
3. Click "날짜 선택" button; assert listbox "가로 캘린더" is visible.
4. Click the option for DATE_B (full Korean locale label via `toKoreanLabel`).
5. Assert URL remains `/diary/DATE_A` (no navigation occurred).
6. Assert textarea now shows "Entry B text".
7. Assert listbox is closed.
8. Assert localStorage still contains DATE_A entry with original text unchanged.

**E2 — date switch from a no-mood entry does not persist partial data**
1. Seed localStorage with only DATE_B; DATE_A has no entry.
2. Navigate to `/diary/DATE_A`; mood picker opens automatically.
3. Dismiss mood picker via "닫기" button.
4. Fill textarea with "Unsaved text no mood" (no mood selected).
5. Click "날짜 선택"; assert strip opens.
6. Click DATE_B cell; assert textarea shows "Entry B only".
7. Assert localStorage contains no entry for DATE_A (save guard exits early when `mood === undefined`).

## Test Files Added / Updated

- `e2e/horizontal-date-picker.spec.ts` — 2 test cases (written in Phase 9; no changes in this phase)
- `e2e/_helpers/seedDiaries.ts` — `seedDiariesScript` localStorage seed utility (shared with `editor.spec.ts`)

## Commands Run

```
npm run test:e2e
```

## Results

| # | File | Test | Result | Duration |
|---|------|------|--------|----------|
| 1 | horizontal-date-picker.spec.ts | E1: switch date A → B, URL stays at A | PASS | 3.9s |
| 2 | horizontal-date-picker.spec.ts | E2: no-mood date switch, no partial persist | PASS | 1.5s |
| 3 | calendar.spec.ts | 캘린더 FAB → 오늘 에디터 이동 | PASS | 3.2s |
| 4 | editor.spec.ts | 빈 셀 → 무드 → 입력 → 저장 → 캘린더 무드 표시 | PASS | 4.9s |

**Total: 4 passed, 0 failed — 13.0s**

Browser: Chromium (Desktop Chrome profile). Config: `playwright.config.ts`, `testDir: ./e2e`, `timeout: 30_000`, `fullyParallel: false`.

## Failures

None.

## Screenshots / Artifacts

No failures occurred. `trace: 'on-first-retry'` is configured; no traces were produced.

## Not Tested

- Month boundary scrolling in the date strip (strip renders ±15 days; scroll past that boundary is a stretch goal).
- Keyboard navigation within the date strip listbox.
- Mobile viewport (config targets Desktop Chrome; mobile-first layout validated by unit tests).

## Verdict
PASS

# Test Report — REQ-007

## Summary

Independent re-run of all verification gates for REQ-007 (main calendar screen). All five commands passed on first attempt. 181/181 unit tests pass across 28 files, 1/1 Playwright E2E spec passes, and all source guards match the self-reported claims. Baseline of 151 tests from REQ-002 through REQ-006 is fully intact. No production source files were modified during verification.

---

## Commands Run

| Command | Exit Code | Output |
|---|---|---|
| `npm run typecheck` | 0 | No output (clean) |
| `npm run lint` | 0 | `No ESLint warnings or errors` (cosmetic `next lint` deprecation notice only) |
| `npm test` | 0 | `181 passed (181)` across 28 files in 4.77s |
| `npm run build` | 0 | 7 routes generated, no TS/lint errors in build pipeline |
| `npm run test:e2e` | 0 | `1 passed (8.6s)` — chromium golden path |

---

## Tests Added / Updated

### New unit test files (REQ-007)

| File | Cases | Environment | Notes |
|---|---|---|---|
| `src/lib/storage/__tests__/useDiaries.test.ts` | 4 | happy-dom | `vi.mock('@/lib/storage')` for readDiaries; 1 in `initial state` block, 3 in `after mount effect` block |
| `src/app/__tests__/CalendarDayCell.test.tsx` | 7 | happy-dom | cell rendering, token class names, onTap, aria-label |
| `src/app/__tests__/CalendarGrid.test.tsx` | 5 | happy-dom | 7-day header order, day count, offset, mood rendering, onCellTap |
| `src/app/__tests__/CalendarHeader.test.tsx` | 6 | happy-dom | month label, nav arrows, 3 icon buttons |
| `src/app/__tests__/CalendarScreen.test.tsx` | 8 | happy-dom | month display, isReady guard, FAB render, FAB routing, prev/next arrows, swipe left/right |

### New E2E file

| File | Cases | Runner |
|---|---|---|
| `e2e/calendar.spec.ts` | 1 | Playwright, Chromium only |

Total new unit cases: 30. Total unit suite: 181 (151 baseline + 30 new). E2E suite: 1.

---

## Results

### Unit test breakdown — all 28 files

| Suite file | Tests | Status |
|---|---|---|
| `src/design-system/__tests__/personas.test.ts` | 17 | PASS |
| `src/lib/storage/__tests__/uuid.test.ts` | 3 | PASS |
| `src/lib/storage/__tests__/settings.test.ts` | 8 | PASS |
| `src/lib/storage/__tests__/conversations.test.ts` | 9 | PASS |
| `src/lib/navigation/__tests__/routes.test.ts` | 10 | PASS |
| `src/lib/storage/__tests__/diaries.test.ts` | 13 | PASS |
| `src/lib/storage/__tests__/ssr.test.ts` | 4 | PASS |
| `src/lib/storage/__tests__/limits.test.ts` | 3 | PASS |
| `src/lib/storage/__tests__/no-direct-localstorage-access.test.ts` | 1 | PASS |
| `src/design-system/__tests__/moods.test.ts` | 12 | PASS |
| `src/design-system/__tests__/useDialogControl.test.ts` | 5 | PASS |
| `src/design-system/__tests__/ConfirmDialog.test.tsx` | 8 | PASS |
| `src/design-system/__tests__/MoodIcon.test.tsx` | 9 | PASS |
| `src/app/__tests__/CalendarDayCell.test.tsx` | 7 | PASS |
| `src/design-system/__tests__/BottomSheet.test.tsx` | 6 | PASS |
| `src/design-system/__tests__/useToast.test.ts` | 5 | PASS |
| `src/lib/storage/__tests__/useDiaries.test.ts` | 4 | PASS |
| `src/app/__tests__/diary-date-page.test.tsx` | 4 | PASS |
| `src/app/__tests__/CalendarHeader.test.tsx` | 6 | PASS |
| `src/design-system/__tests__/EmptyState.test.tsx` | 7 | PASS |
| `src/design-system/__tests__/Card.test.tsx` | 5 | PASS |
| `src/design-system/__tests__/FAB.test.tsx` | 5 | PASS |
| `src/design-system/__tests__/IconButton.test.tsx` | 6 | PASS |
| `src/app/__tests__/CalendarGrid.test.tsx` | 5 | PASS |
| `src/app/__tests__/CalendarScreen.test.tsx` | 8 | PASS |
| `src/lib/navigation/__tests__/setupNextNavigation.test.ts` | 3 | PASS |
| `src/design-system/__tests__/Toast.test.tsx` | 5 | PASS |
| `src/app/__tests__/not-found.test.tsx` | 3 | PASS |
| **Total** | **181** | **PASS** |

### E2E golden path

`캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동` — navigates to `/`, asserts month label visible, asserts `role=main` visible, clicks FAB `오늘 일기 쓰기`, asserts URL matches `/diary/YYYY-MM-DD` for today. PASS (2.3s, Chromium).

---

## Failures

None.

---

## Source Guards

### "use client" directives

| File | Directive | Expected |
|---|---|---|
| `src/app/page.tsx` | present (line 1) | Required — thin client boundary |
| `src/app/_components/CalendarDayCell.tsx` | present (line 1) | Required — click handler |
| `src/app/_components/CalendarGrid.tsx` | NOT present | Correct — pure component rendered inside client tree |
| `src/app/_components/CalendarHeader.tsx` | present (line 1) | Required — callback props |
| `src/app/_components/CalendarScreen.tsx` | present (line 1) | Required — state + router |
| `src/lib/storage/useDiaries.ts` | present (line 3) | Required — React hook |

### `src/app/page.tsx` line count

7 lines. Confirmed thin boundary: `"use client"` + blank line + import `CalendarScreen` + blank line + default export wrapping `<CalendarScreen />` + closing brace + blank line.

### Config files

| File | Claim | Verified |
|---|---|---|
| `vitest.config.ts` | `exclude: ['node_modules', 'e2e/**']` | Yes — line 9 |
| `playwright.config.ts` | Present at repo root; `testDir: './e2e'`; Chromium only; `webServer` on port 3000 | Yes |
| `package.json` | `@playwright/test: ^1.44.0` in devDependencies | Yes — line 33 |
| `package.json` | `test:e2e` and `test:e2e:install` scripts | Yes — lines 13–14 |

### `globals.css` token

`--color-cell-empty: #C8C8C8` confirmed at line 13 of `src/app/globals.css`.

---

## Build Output (7 routes)

```
Route (app)                  Size    First Load JS
┌ ○ /                       2.71 kB      105 kB
├ ○ /_not-found              138 B       103 kB
├ ○ /chat                    138 B       103 kB
├ ƒ /diary/[date]            138 B       103 kB
├ ○ /list                    138 B       103 kB
└ ○ /stats                   138 B       103 kB
```

`/` now ships 2.71 kB of client JS (CalendarScreen tree) versus the 138–141 B placeholder size from REQ-006. `/diary/[date]` remains `ƒ` (dynamic). All 7 routes (6 app routes + `/_not-found`) present.

---

## Existing Tests Regression

151 baseline tests from REQ-002 through REQ-006 all pass without modification. No baseline test file was touched by REQ-007.

---

## Test Plan Coverage vs Plan (`06-test-plan.md`)

### Planned case counts vs actual

| Plan file | Planned cases | Actual cases | Delta |
|---|---|---|---|
| `useDiaries.test.ts` | 4 | 4 | 0 |
| `CalendarDayCell.test.tsx` | 6 | 7 | +1 (aria-label split into two `it()` calls) |
| `CalendarGrid.test.tsx` | 5 | 5 | 0 |
| `CalendarHeader.test.tsx` | 6 | 6 | 0 |
| `CalendarScreen.test.tsx` | 8 | 8 | 0 |
| `e2e/calendar.spec.ts` | 1 | 1 | 0 |

All plan invariants covered. `CalendarDayCell` has one extra case (strictly a superset).

---

## Discrepancies / Notes

1. **`useDiaries` initial `isReady=false` test adapted**: happy-dom flushes `useEffect` synchronously inside `renderHook`, making `isReady=false` unobservable from outside the render cycle. The plan's `it('returns isReady=false … before the effect runs')` case was rewritten to verify post-effect state. The hydration guard (grid suppressed while `!isReady`) is separately and correctly verified in `CalendarScreen.test.tsx` via a mock that returns `{ isReady: false }` — no production behavior gap.

2. **`CalendarDayCell` 7 cases vs 6 in plan**: aria-label invariant was split into two `it()` calls (entry-present vs entry-absent). Total coverage is a strict superset of the plan.

3. **Swipe threshold is 40px in production, plan noted 50px as option**: `CalendarScreen.test.tsx` fires events with ±60px deltas, which satisfies either threshold. No test gap.

4. **Cosmetic warnings (non-blocking)**: Vitest CJS deprecation warning and `next lint` deprecation notice both pre-exist from earlier REQs.

---

## Coverage Notes

All caller invariants from `04-api-contract.md` scoped to REQ-007 are covered:

- No direct `localStorage` access — `vi.mock('@/lib/storage')` boundary in `useDiaries.test.ts` enforces the abstraction.
- All navigation via `Routes.*` — `CalendarScreen.test.tsx` FAB test asserts `mockRouter.push` receives the `Routes.diary(today)` output, not a raw string.
- Token class discipline (`text-cell-empty`, `text-peach`, `bg-peach`) — `CalendarDayCell.test.tsx` checks className values; no hex literals asserted anywhere.
- Korean string discipline — all button aria-labels, weekday headers, and month label in Korean verified across `CalendarGrid`, `CalendarHeader`, and `CalendarScreen` tests.
- Sunday-first weekday order — `CalendarGrid.test.tsx` case 1.
- Grid suppressed while `!isReady` — `CalendarScreen.test.tsx` case 2.

---

## Remaining Risks

1. **`useDiaries` reactive sync**: hook reads once on mount. After REQ-009 saves an entry and back-navigates, the calendar will not reflect the new entry until remount. Documented in implementation report as known deferred risk (REQ-009 scope).
2. **Swipe UX on real touch devices**: pointer events used; `touch-action: none` CSS may be needed to prevent browser swipe-back gesture from intercepting. Deferred to manual QA.
3. **Year not shown in header**: `year` state exists and is threaded through correctly; suppressed in MVP per PRD. Trivial addition later.

---

## Verdict
PASS

# Code Review Report — REQ-014

## Summary

REQ-014 implements the Stats screen (월별 기분 분포 차트) at `src/app/stats/page.tsx`, replacing an 8-line stub. Four new source files are introduced (`addMonths.ts`, `useMoodStats.ts`, `StatsHeader.tsx`, `MoodBarChart.tsx`) plus `page.tsx` itself, and `ListHeader.tsx` receives a one-line refactor that removes the duplicate inline `addMonths` and imports the shared utility instead. Implementation is pure client-side with no new npm dependencies. All 322 unit tests and 8 Playwright specs pass. No blocking issues found.

---

## Files Reviewed

| File | Action | Lines |
|---|---|---|
| `src/lib/utils/addMonths.ts` | NEW | 14 |
| `src/app/list/_components/ListHeader.tsx` | MODIFIED | 70 (was 75) |
| `src/app/stats/_components/useMoodStats.ts` | NEW | 45 |
| `src/app/stats/_components/StatsHeader.tsx` | NEW | 96 |
| `src/app/stats/_components/MoodBarChart.tsx` | NEW | 59 |
| `src/app/stats/page.tsx` | REPLACED | 48 |
| `src/lib/utils/__tests__/addMonths.test.ts` | NEW | 28 |
| `src/app/stats/_components/__tests__/useMoodStats.test.ts` | NEW | 78 |
| `src/app/stats/__tests__/StatsScreen.test.tsx` | NEW | 231 |

---

## Blocking Issues

None.

---

## Non-Blocking Suggestions

1. **SVG icon duplication between `StatsHeader.tsx` and `ListHeader.tsx`.** Both files define their own `ChevronLeft`/`ChevronRight` as inline SVG components. CLAUDE.md rule ("두 번째 사용처가 거의 항상 나타난다") applies. Extract to `src/design-system/icons.tsx` before a fourth screen.

2. **`MoodBarChart` does not guard against `MOOD_MAP[moodId]` undefined.** Safe by construction (`useMoodStats` only emits moods in `MOODS`). Legacy `moodId` in storage would throw. A `mood?.color ?? '#EBEBEB'` fallback would defensively guard.

3. **`currentMonth` derivation runs on every render.** `new Date()` called unconditionally. Used only as `useState` initial value so computed once in practice, but a `useMemo([], …)` or module constant makes intent explicit.

---

## Nits

1. `MoodBarChart.tsx` lacks `"use client"` directive but is rendered inside a client tree. Fine but asymmetric vs StatsHeader.
2. `useMoodStats.test.ts` comment references hardcoded MOODS array index — fragile to mood order changes.
3. `StatsScreen.test.tsx` `CURRENT_MONTH = '2026-05'` constant could silently drift on tests that depend on default-month behavior (pre-existing pattern from ListScreen).

---

## Positive Notes

- `addMonths` extraction is clean. Both callers import the shared util — no duplication.
- `useMoodStats` correctly wraps in `useMemo([entries, yearMonth])` and tiebreak logic matches contract exactly.
- `MoodBarChart` purely presentational with zero state. `Math.max(8, ...)` floor is a percentage, not pixels.
- All Korean string literals match the locked contract exactly.
- `page.tsx` correctly passes `[]` to `useMoodStats` when `!isReady`, calls only `setMonth` (no `router.push`).
- No `any`, no `@ts-ignore`, no new npm dependencies.
- Test coverage comprehensive: 6 + 5 + 10 = 21 new test cases.

---

## Invariant Walkthrough

| Invariant | Status |
|---|---|
| 1. `addMonths` callers pass "YYYY-MM" | PASS |
| 2. `useMoodStats` always called unconditionally | PASS — `[]` passed when `!isReady` |
| 3. `StatsHeader` uses existing `IconButton` | PASS |
| 4. `MoodBarChart` uses existing `MoodIcon`, `EmptyState` | PASS |
| 5. Bar widths via inline style percentage | PASS |
| 6. Bar colors via `mood.color` from `MOODS` | PASS |
| 7. `<Suspense>` wraps `useSearchParams` consumer | PASS |
| 8. Sort state never written to localStorage | PASS |

---

## File Size Audit

| File | Target | Actual | Status |
|---|---|---|---|
| `addMonths.ts` | ~8 | 14 | OK (JSDoc) |
| `useMoodStats.ts` | ~30 | 45 | OK |
| `StatsHeader.tsx` | ~60 | 96 | Soft-limit; SVG defs not naturally splittable |
| `MoodBarChart.tsx` | ~60 | 59 | PASS |
| `page.tsx` | ~30 | 48 | OK |

---

## Architecture Consistency

- `"use client"` + `<Suspense>` + `useSearchParams` + `useDiaries` pattern identical to `src/app/list/page.tsx`.
- `_components/` colocation matches REQ-013 pattern.
- `src/lib/utils/` consistent with existing `formatListDate.ts`.
- `MoodBarChart` purely presentational; `stats` passed from page — correct separation.

---

## Contract Consistency

All four interface contracts implemented exactly. No prop renames, no signature deviations. Korean string literals verified character-by-character. `data-testid` attributes present as specified.

---

## Verdict
PASS

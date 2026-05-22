# Frontend Implementation — REQ-014: 통계 화면

## Summary

REQ-014 implements the Stats screen at `src/app/stats/page.tsx` (was an 8-line stub). The screen shows a mood-distribution horizontal bar chart for a selected month, with a two-row month navigator (year + M월 + prev/next arrows) and an ✕ close button. Implementation is pure client-side: no backend calls, no new npm packages. The pattern mirrors `src/app/list/page.tsx` exactly: `"use client"` + `Suspense` + `useSearchParams` + `useDiaries`. The `addMonths` helper was extracted from `ListHeader.tsx` into a shared utility. All 322 tests pass (46 test files).

---

## Files Changed

| File | Action | Lines | Notes |
|---|---|---|---|
| `src/lib/utils/addMonths.ts` | NEW | 14 | Shared utility extracted from ListHeader |
| `src/app/list/_components/ListHeader.tsx` | MODIFIED | 70 | Replaced inline `addMonths` with import — 1-line behavioral change |
| `src/app/stats/_components/useMoodStats.ts` | NEW | 45 | `useMoodStats(entries, yearMonth)` hook with useMemo |
| `src/app/stats/_components/StatsHeader.tsx` | NEW | 96 | Year + M월 nav + ✕ close (inline SVGs add lines) |
| `src/app/stats/_components/MoodBarChart.tsx` | NEW | 59 | Summary icon row + bar rows + empty state |
| `src/app/stats/page.tsx` | REPLACED | 48 | "use client" Suspense shell — was 8-line stub |
| `src/lib/utils/__tests__/addMonths.test.ts` | NEW | 28 | 6 cases (AM1–AM6) |
| `src/app/stats/_components/__tests__/useMoodStats.test.ts` | NEW | 78 | 5 cases (UMS1–UMS5) |
| `src/app/stats/__tests__/StatsScreen.test.tsx` | NEW | 231 | 10 cases (SS1–SS10) |

---

## Behavior Added

- **Stats screen** at `/stats` renders a full month mood distribution chart.
- **StatsHeader**: two-row display — bare 4-digit year above, `M월` (no zero-padding) below flanked by `IconButton` chevrons. ✕ `IconButton` positioned `absolute top-4 right-4`.
- **MoodBarChart**: when data exists — summary icon row (`size={64}`) + horizontal bar rows sorted count DESC (tiebreak MOODS master-array index ASC). Bar fill: `Math.max(8, (count / maxCount) * 100)%` with inline `backgroundColor: mood.color`. Empty month: `EmptyState` with text `"이 달에는 기록이 없어요"`.
- **Month navigation**: `setMonth` only (no `router.push`). Initial month from `?month=` search param, defaulting to current calendar month.
- **Close**: `router.back()`.
- **Loading state**: `"불러오는 중…"` shown when `!isReady`; `useMoodStats` receives `[]` to satisfy rules of hooks.

---

## Existing Patterns Reused

- `"use client"` + `<Suspense>` + `useSearchParams` pattern from `src/app/list/page.tsx`
- `useDiaries()` from `@/lib/storage/useDiaries`
- `IconButton` from `@/design-system/IconButton` — close + prev/next month buttons
- `MoodIcon` from `@/design-system/MoodIcon` — summary row (size=64) and bar rows (size=40)
- `EmptyState` from `@/design-system/EmptyState` — empty month state
- `MOODS` / `MOOD_MAP` from `@/design-system/moods` — mood color and order
- `LOADING` div constant pattern from `list/page.tsx`
- Mutable `currentSearchParams` pattern from `ListScreen.test.tsx`
- `vi.mock('next/navigation', ...)` + `setupNextNavigation.ts` helpers
- `vi.mock('@/lib/storage/useDiaries', ...)` with `vi.fn()` + per-test `mockReturnValue`
- `makeEntry` inline fixture factory pattern
- `@vitest-environment happy-dom` at file top for component tests

---

## Tests Added / Updated

| File | Cases | Result |
|---|---|---|
| `src/lib/utils/__tests__/addMonths.test.ts` | 6 (AM1–AM6) | PASS |
| `src/app/stats/_components/__tests__/useMoodStats.test.ts` | 5 (UMS1–UMS5) | PASS |
| `src/app/stats/__tests__/StatsScreen.test.tsx` | 10 (SS1–SS10) | PASS |

**Regression:** All 12 existing ListScreen tests (LS1–LS12) pass after the `addMonths` extraction. Full suite: 322 tests, 46 files, all PASS.

**Deviation from test plan:** The plan stated "No DOM environment needed" for `useMoodStats.test.ts`, but `renderHook` from `@testing-library/react` v16 requires a DOM environment. Added `// @vitest-environment happy-dom` to that file. The test logic itself is unchanged.

---

## Commands Run

```
npx tsc --noEmit          → 0 errors
npm run lint              → 0 warnings, 0 errors
npx vitest run --reporter=basic  → 322 passed (46 files), 0 failed
```

---

## Risks / Follow-ups

1. **StatsHeader.tsx is 96 lines** — over the ~60-line target. The excess is entirely inline SVG for three icons (CloseIcon, ChevronLeft, ChevronRight). Could split icons into a `_icons.tsx` file if future headers need them; deferred as low priority since the component is single-responsibility.
2. **`useMoodStats` environment note**: `renderHook` from `@testing-library/react` requires a DOM. Added `@vitest-environment happy-dom`. This matches the pattern already established in all other hook tests in the project.
3. **No `statsWithMonth` URL helper**: Stats uses `useState` only for month navigation (no URL push) as per architecture decision. Navigating away and back resets to current month / `?month=` param if provided by caller.

---

## Verdict
PASS

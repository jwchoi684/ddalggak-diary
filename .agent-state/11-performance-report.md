# Performance Review — REQ-007

## Summary

REQ-007 delivers the first real interactive screen: 7-column monthly calendar grid with mood icons, header navigation, swipe, FAB. Feature surface is small; traffic bounded by single-user local-storage app. No blocking issues. One low-priority stabilization gap (already flagged as NB-2 in code review) and two trivial per-render allocations noted.

## Scope

Files reviewed: 4 calendar components + `useDiaries` hook + agent-state reports (04, 07, 08, 09).

## Findings

### 1. Cell render cost on month change — Info (React.memo effective)

`CalendarDayCell` is `React.memo`-wrapped (named function pattern, preserves DevTools display name). `CalendarGrid` props: `year`, `month`, `diaryByDate` (useMemo-stable), `today` (string stable), `onCellTap` (useCallback-stable). On month nav, all 31 cells receive new `date`-derived props and correctly re-render — by design.

Math: 31 cells × shallow memo compare (~1 µs) + DOM diff = ~31–50 µs. Imperceptible.

### 2. `diaryByDate` Map build — Info

`useMemo([entries])` builds `Map<string, DiaryEntry>` in O(n) where n ≤ 365 entries/year. Not rebuilt on month nav (entries reference stable after `isReady=true`). Correct.

### 3. First Load JS delta — Info (acceptable)

`/` route: 138 B → 2.71 kB. Delta = 2.57 kB covering 4 components + hook. Shared chunk 103 kB unchanged. Acceptable for mobile-first app. No tree-shaking concern (per-file imports, no barrel aggregation).

### 4. Three inline arrow callbacks in CalendarScreen — Low (NB-2 from code review)

`onSearch`/`onStats`/`onList` are inline arrows, new function refs per render. Zero impact today (CalendarHeader not memoized). Required if CalendarHeader is ever memoized. Already documented.

### 5. `today` re-derived per render — Low (trivial)

`new Date().toLocaleDateString('sv')` runs every `CalendarScreen` render. Microsecond-level. `useCallback([router, today])` compares by string value, doesn't invalidate within same day. Past-midnight refresh is correct behavior. Could `useMemo(() => ..., [])` but cost is unmeasurable.

### 6. `useDiaries` synchronous localStorage read — Info

Runs once per mount, after first paint, on client. JSON.parse of ≤200 kB completes in single-digit ms. SSR shell renders empty; entries appear after hydration. Correct pattern for localStorage-backed apps.

### 7. `useDiaries` does not re-read after writes — Info (deferred)

After REQ-009 saves an entry and user navigates back, `useDiaries` won't reflect new entry unless component remounts. Next.js App Router navigation between pages triggers a new mount in practice. If REQ-009 uses cached `router.back()`, stale state risk. Deferred per API contract invariant. No action for REQ-007.

### 8. Pointer event handlers — Info (no state, no re-render)

`useRef<number | null>` for `pointerStartX` — no state set. `onPointerDown`/`onPointerUp` are `useCallback`-stable. One `setVisibleMonth` per completed gesture (minimum). NB-3 missing `onPointerCancel` is correctness, not perf.

### 9. `CalendarGrid` cell array allocation — Info (trivial)

`slots: (number | null)[]` of ≤42 elements per render. O(42), stack-allocated in V8. No concern.

## Capacity Math

| Metric | Value | Notes |
|---|---|---|
| Max cells rendered per month | 42 (6 weeks × 7) | In-month ≤ 31; rest empty divs |
| React.memo shallow compare cost | ~31 µs (31 × ~1 µs) | Per month nav |
| `diaryByDate` Map build | O(n), n ≤ 365 | Once per mount |
| localStorage payload | < 200 kB | 365 entries × ~500 B |
| First Load JS `/` | 2.71 kB page chunk + 103 kB shared | Delta from REQ-006: +2.57 kB |
| Inline callback allocations | 3 new fns per render | No observable cost |

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **Stabilize `onSearch`/`onStats`/`onList` with `useCallback`** (NB-2). No impact today; required if CalendarHeader is memoized in future. Low effort.
2. **Memoize `today` with `useMemo([], [])`**. Truly trivial.
3. **Add `onPointerCancel` handler** (NB-3). Correctness fix.
4. **Verify `touch-action` CSS on swipe container**. Browser swipe-back / overscroll may compete with 40px threshold on real mobile. Deferred to manual QA (test report Risk 2).

## Verdict

PASS

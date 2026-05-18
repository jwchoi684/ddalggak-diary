# Performance Review — REQ-008

## Summary

REQ-008 introduces `MoodPickerSheet.tsx` (129 lines) and its test file. The component is a pure client-side UI layer with a fixed, bounded data set (10 moods). No backend calls, no large data queries, no pagination, no caching, and no heavy computation. The performance surface is narrow.

## Scope

Files reviewed:
- `/Users/jay/Documents/Projects/ai_diary/src/design-system/MoodPickerSheet.tsx`
- `/Users/jay/Documents/Projects/ai_diary/src/design-system/__tests__/MoodPickerSheet.test.tsx`

Supporting context:
- `.agent-state/03-technical-design.md` (Performance Considerations section)
- `.agent-state/requirements/REQ-008.md`

## Findings

1. **Inline closure per mood cell (non-blocking).** `onClick={() => handleSelect(mood.id)}` inside `MOODS.map()` creates 10 new closures on every render. `onInactiveTap={() => toast.show('곧 만나요!')}` passed to `MoodPickerTabs` also re-creates on every parent render. For 10 items in a modal that renders at user interaction frequency (not in a tight loop or scroll handler), the GC pressure is immeasurable. `useCallback` would cost more in readability than it saves here.

2. **Always-mounted rendering (non-blocking).** `BottomSheet` is always-mounted per REQ-005 design; `MoodPickerSheet` inherits that invariant. The 10 mood cells and `MoodIcon` instances are always in the DOM tree but hidden when `open=false`. At 10 items this is negligible. `MoodIcon` at 72px each renders emoji placeholders, not images or canvas — zero media loading cost.

3. **`Intl.DateTimeFormat` allocation (non-blocking, already addressed).** `WEEKDAY_FMT` is module-level — allocated once, reused on every `formatSheetDate` call. Correct.

4. **`CloseIcon` SVG (non-blocking, already addressed).** Defined as a module-level constant JSX element. React will not re-evaluate the SVG subtree; it is passed by reference to `IconButton`. Correct.

5. **No N+1 / waterfall risks.** Component is purely compositional with no async operations, no data fetching, no side effects beyond `useToast` state.

6. **Bundle size.** One new 129-line file importing only already-present design-system peers. No new third-party dependencies added. Tree-shaken by Next.js — no impact on routes that do not import `MoodPickerSheet`.

7. **No `useCallback`/`useMemo` on `handleCancel`/`handleSelect`.** These are re-created each render. Given the modal renders once per user interaction and contains 10 cells, there is no measurable benefit to memoizing them. The technical design explicitly documents this as an accepted tradeoff.

8. **`formatSheetDate` called on every render (non-blocking).** Pure function, string operations only, no DOM access. Cost is sub-microsecond.

## Blocking Issues

None.

## Non-Blocking Suggestions

- If `MoodPickerSheet` is ever promoted to a context where its parent re-renders at high frequency (e.g., inside a live-updating calendar), wrapping `handleSelect` and `handleCancel` with `useCallback` at that point would be sufficient. No action needed now.
- `MoodPickerTabs` receives a new arrow function reference on every `MoodPickerSheet` render. Wrapping the parent in `React.memo` or stabilising the prop with `useCallback` is a future option if profiling ever shows it as a hot path. Not warranted for a modal opened by user tap.

## Verdict
PASS

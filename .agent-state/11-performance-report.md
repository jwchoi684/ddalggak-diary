# Performance Review Report — REQ-010

## Summary

REQ-010 adds a collapsible horizontal date strip (61 cells, ±30 days) to the diary editor. All performance characteristics are acceptable for a single-user, localStorage-backed, mobile-first app. No blocking issues were found. Three non-blocking observations are noted.

## Scope

Files reviewed:
- `src/lib/hooks/useHorizontalDatePicker.ts`
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx`
- `src/app/diary/[date]/_components/DateCell.tsx`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/lib/storage/diaries.ts`
- `.agent-state/03-technical-design.md`, `.agent-state/09-code-review-report.md`

## Findings

**1. Re-render churn from `useHorizontalDatePicker` when strip is closed.**

`useHorizontalDatePicker` is called unconditionally inside `Editor` on every render. When the strip is closed (the common state while typing), the hook runs three `useMemo` and two `useCallback` computations on every render. `dateRange` is memoized on `[currentDate]` — stable while typing, so it does not recompute. `entryMap` is memoized on `[isOpen]` — stable while typing (strip stays closed), so it does not recompute. `handleDateSelect` is memoized on `[currentDate, saveFn, autosaveValue, onDateChange, onSaveError]`. `autosaveValue` is a `useMemo` keyed on `[state.mood, state.text, state.textAlign]`; each character typed changes `state.text`, which recreates `autosaveValue`, which invalidates `handleDateSelect`. Additionally, `onSaveError` is an inline arrow `(msg) => toast.show(msg)` (Editor line 69) that is recreated on every render, which also invalidates `handleDateSelect`. In practice this means `handleDateSelect` is recreated on every keystroke. Because the strip is not mounted when closed (`{stripOpen && <HorizontalDatePicker .../>}`), this recreated callback never reaches any mounted component; it is dropped immediately. The churn is therefore limited to a single `useCallback` invocation per keystroke inside the hook — roughly equivalent to allocating a small closure object. For a textarea in a single-user diary app this cost is negligible.

**2. 61 DateCell render cost when strip opens.**

Each `DateCell` is a small functional component: two string operations (`date.slice(-2).replace(...)` for `dayNumber` and `date === today` / `date === currentDate` comparisons), one conditional branch for `entry`, and one optional `MoodIcon`. None of these are expensive. The 61 cells are rendered in a single pass on mount. There is no virtualization, which is appropriate — 61 cells at 44px width each fit in ~2900px of scroll width; all are allocated but only ~7-9 are visible. A 61-element DOM is within normal browser capacity.

`onSelect` is passed as `onDateSelect` from `HorizontalDatePicker` to each `DateCell` as a prop, with each cell capturing its own `date` via `() => onSelect(date)` in the `onClick`. This inline arrow is created per cell per render, but since `HorizontalDatePicker` only mounts on open, and renders only once (no internal state changes during the strip's lifetime unless `onDateSelect` itself changes), this is effectively a one-time allocation of 61 arrow functions. Acceptable.

**3. `scrollIntoView` on mount.**

`HorizontalDatePicker` uses `useEffect([], [])` — the empty dependency array ensures the DOM query and `scrollIntoView` call fire exactly once, on mount. It does not re-fire on subsequent renders. This is correct.

**4. `readDiaries()` cost per open.**

`readDiaries()` performs one `localStorage.getItem` and one `JSON.parse` of the full diary array. For a personal diary app the array is bounded by roughly one entry per day of use (typically tens to low hundreds of entries). `JSON.parse` of a few hundred small objects on modern mobile hardware takes well under 1ms. The `entryMap` memo is keyed on `[isOpen]`, so this runs once on open and once on close. The close-time recompute is a minor unnecessary cost (noted by the code review), but it is not a performance concern.

**5. `buildDateRange` cost.**

A 61-iteration loop over integer arithmetic and a single `toISOString().slice(0, 10)` call per iteration. This is negligible. It runs once per `currentDate` change (i.e., once per date-cell tap), not per keystroke.

**6. `Intl.DateTimeFormat` instantiation per render in `DateCell`.**

`DateCell` calls `toKoreanDateLabel(date)` on every render, which instantiates `new Intl.DateTimeFormat('ko-KR', ...)` inside the function body on each call. Since `HorizontalDatePicker` renders 61 `DateCell` instances on mount, this creates 61 `Intl.DateTimeFormat` objects. Modern V8 caches the resolved locale data for `'ko-KR'` so subsequent instantiations do not re-parse locale data, but object construction overhead is still 61x. In contrast, `EditorBody.tsx` correctly uses a module-level `DATE_FMT` singleton. The inconsistency is a minor inefficiency but not a performance problem at this scale — `Intl.DateTimeFormat` construction inside a one-time mount of 61 cells is not a hot path.

**7. CSS `scroll-snap-type: x mandatory` on mobile Chromium.**

CSS scroll snap is GPU-composited in all modern browsers including mobile Chromium (Chrome for Android, WebView). It does not involve a JS scroll listener and does not block the main thread during scrolling. The `WebkitOverflowScrolling: 'touch'` style enables momentum scrolling on iOS. No performance concern.

**8. `Editor.tsx` re-render frequency with strip wired.**

Typing in the textarea dispatches `SET_TEXT` into `useEditorState`, which re-renders `Editor`. Each re-render calls `useHorizontalDatePicker` (always-on hook). As discussed in finding #1, `autosaveValue` changes on every keystroke (by design — it tracks live text), which causes `handleDateSelect` to be recreated, but since the strip is unmounted while closed the callback is never propagated to any child. `dateRange` and `entryMap` are stable during typing (their deps do not change). Net re-render work added to each keystroke: one `useMemo` equality check (autosaveValue deps changed), one `useMemo` equality check (dateRange deps unchanged — skip), one `useMemo` equality check (entryMap deps unchanged — skip), one `useCallback` recreation (handleDateSelect). This is a typical React overhead per keystroke and is within expected norms for a mobile app of this kind.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **`Intl.DateTimeFormat` in `DateCell.tsx` — move to module-level singleton.** `toKoreanDateLabel` instantiates a new formatter on each call. Elevating `new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })` to a module-level constant (matching the `DATE_FMT` pattern already used in `EditorBody.tsx`) eliminates 61 object allocations per strip open. Low priority, but it is a straightforward one-line fix and makes the pattern consistent across the codebase.

2. **`onSaveError` inline arrow causes `handleDateSelect` recreation on every Editor render.** Wrapping `(msg) => toast.show(msg)` at Editor line 69 in a `useCallback([toast.show])` would stabilize the reference and prevent `handleDateSelect` from being recreated on every keystroke. Since the strip is unmounted while closed this has zero observable impact today, but the fix is trivial and preempts the issue if the strip ever supports live preview updates without closing.

3. **`entryMap` recomputes on strip close (as well as open).** The `eslint-disable` on `useMemo([isOpen])` is intentional and documented. A minimal mitigation without using a ref hack would be to check `if (!isOpen) return prev` inside the memo factory — but `useMemo` does not expose `prev`. This is acceptable as-is for the current scale; note it before the diary corpus grows significantly.

## Verdict
PASS

# Performance Review Report — REQ-005

## Summary

REQ-005 introduces 9 UI primitives (7 components + 2 hooks) that form the design-system vocabulary for all subsequent screen REQs. The change is purely additive: no HTTP endpoints, no data queries, no background jobs, no storage access. Performance considerations are limited to client-side render cost, DOM overhead, timer management, and bundle delta. No blocking issues were found.

## Scope

9 new source files in `src/design-system/` + 1 additive change in `src/app/globals.css`. No new runtime dependencies.

## Findings

### 1. Render cost — Info

All 9 primitives are thin wrappers over native HTML elements. No derived state, no memoized computation, no context read, no list rendering within primitives. Per-render cost bounded by a few Tailwind class concatenations and one conditional. Negligible.

Card and EmptyState are Server Components — zero client hydration cost beyond what their parent pays. The other 7 hydrate once on mount.

### 2. BottomSheet always-mounted DOM overhead — Low

Deliberate trade-off: conditional unmounting breaks slide-out animation. Cost = one `<dialog>` + grip `<div>` + children subtree per mount. At MVP scale fine (single-page mobile, ≤2 sheets max per screen).

When `<dialog>` is not shown via `showModal()`, browsers remove it from the accessibility tree (native behavior), so screen-reader overhead is zero. Layout cost negligible for a single node.

Revisit if a future screen mounts 5+ sheets simultaneously. Document constraint at adoption sites (REQ-008, REQ-016) rather than changing the primitive.

### 3. useToast timer cleanup — Info

Three `clearTimeout` paths confirmed in code and tests: on `hide()`, on `show()` re-call, in `useEffect` cleanup. No leak. Re-calling `show()` correctly resets countdown rather than stacking timers.

### 4. useDialogControl effect on rapid open toggle — Info

`useEffect([open])` schedules `showModal()`/`close()` per change. Optional chaining (`ref.current?.showModal()`) handles null. Native `<dialog>` API tolerates `close()` on already-closed dialog (no-op).

### 5. Missing React.memo on hot-path primitives — Low (recommendation for REQ-007+)

None of the 9 primitives wrapped in `React.memo`. Correct default — `memo` has overhead and is only a net win for expensive/many-instance components.

Concern lands at REQ-007 (calendar grid, 31 cells). Recommended: wrap the **day-cell composite** in `React.memo` (not `IconButton` itself), stabilize callbacks with `useCallback`. Wrapping `IconButton` directly would add comparison overhead to every use site, most of which are headers with 2-3 buttons.

### 6. Bundle size delta — Info

9 files, 447 source lines. Zero new runtime deps. Estimated 1.5-3 KB minified+gzipped. Next.js code-splits at page boundary; per-file imports (no barrel) allow effective tree-shaking.

### 7. Toast z-index vs FAB overlap — Info

Toast: `fixed bottom-24` (96px from bottom), centered. FAB: `fixed bottom-6 right-6` (24px), pinned right. No collision at current geometry. `z-50` on Toast; FAB has no explicit z-index. If FAB acquires a higher stacking context in a future layout, Toast could be obscured. Low-probability risk, deferred.

### 8. No server-side data paths affected — Info

No `fetch`, no `localStorage`, no `async`, no server actions. Query complexity / index / pagination / N+1 / cache / background jobs don't apply.

## Capacity Math

Calendar screen at REQ-007 worst-case:
- 31 day cells × (1 mood emoji + 1 interactive element)
- 2-3 header IconButtons
- 1 FAB
- Total interactive: ~35

At 0.05ms per cell reconciliation = ~1.6ms per state change. Within React's 16ms frame budget. No dropped frames at current geometry.

## Recommendations Mapped to Owner REQ

- **REQ-007 (calendar)**: wrap day-cell composite in `React.memo`. Stabilize callbacks with `useCallback`. Profile before optimizing; don't memo IconButton itself.
- **REQ-008 (mood picker, first BottomSheet consumer)**: document always-mounted constraint. If a screen mounts >1 sheet, prefer single shared `BottomSheet` with swappable children controlled by state.
- **REQ-016 (persona picker)**: same always-mounted constraint; 14 personas in one sheet is fine.
- **REQ-009+ (composite screens)**: state driving primitive re-renders should be local. Lifting text-input state to page level causes all primitives to re-render on each keystroke.

## Non-Blocking Suggestions

1. Add a performance budget comment in REQ-007 calendar cell component noting always-mounted BottomSheet + React.memo recommendation.
2. `BottomSheet` uses inline `translate` style for animation. A CSS class approach (data-open driving a class in globals.css) would hand animation to the compositor thread. Micro-optimization, not worth changing pre-profile. Track for REQ-006.
3. `onDialogClick` in `useDialogControl` is re-created on every render (not wrapped in `useCallback`). Currently passed only to a DOM `<dialog>` node — fine. If callers thread it into memoized children, add `useCallback` at that point.

## Verdict
PASS

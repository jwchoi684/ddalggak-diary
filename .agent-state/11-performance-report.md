# Performance Review Report — REQ-009

## Summary

REQ-009 adds the diary editor at `/diary/[date]`. The change is entirely client-side (Next.js App Router, React 19, localStorage). There are no backend calls, no network requests, no pagination, no large data queries, and no background jobs. The feature affects two narrow performance-sensitive areas: (1) the autosave debounce timer, and (2) localStorage read/write frequency. Both are implemented correctly. No blocking performance issues were found.

## Scope

Files reviewed:

- `src/app/diary/[date]/page.tsx`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/app/diary/[date]/_components/EditorToolbar.tsx`
- `src/app/diary/[date]/_components/EditorHeader.tsx`
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx`
- `src/lib/hooks/useAutosave.ts`
- `src/lib/hooks/useEditorState.ts`
- `src/design-system/useDialogControl.ts`
- `src/lib/storage/diaries.ts`

## Findings

### 1. Autosave debounce — correct, no timer leaks

`useAutosave` is a single `useEffect` that schedules `setTimeout` and cancels it via the cleanup return. Because `[value, delayMs, saveFn]` are the deps, any change to those three cancels the prior timer and starts a fresh one. On unmount the cleanup fires and the pending timer is cancelled. `saveFn` is not called after unmount. Textbook correct pattern.

The 1-second debounce is appropriate. Rapid keystrokes will repeatedly cancel-and-reschedule without amplification — each keystroke merely resets one timer. There is no accumulation of concurrent timers.

### 2. `saveFn` / `autosaveValue` memoization — correct

In `Editor.tsx`:
- `autosaveValue` is wrapped in `useMemo([state.mood, state.text, state.textAlign])`. Object identity is stable between renders that do not change those three fields, so the autosave timer does not reset on unrelated state changes (e.g., opening the more-menu, toggling dialogs).
- `saveFn` is wrapped in `useCallback([state.persistedId, state.persistedCreatedAt, date, dispatch])`. It only gets a new identity when persisted identity data changes (first save, or after delete), which is rare.

These two together mean keystrokes only reset the debounce timer — not toolbar re-renders or dialog open/close events.

### 3. localStorage read frequency — one read on mount, writes only on save

`readDiaries()` is called exactly once inside the `useEffect` in `useEditorState`, and only on mount or if `date` changes (impossible since the route is static per navigation). No polling or read-on-keystroke.

`upsertDiary` calls `readDiaries()` internally (read-then-write pattern) every time it runs. One `JSON.parse` + one `JSON.stringify` per save event. For a single-user app with at most a few hundred diary entries, this is negligible. At 5000 characters of maximum text, the entire serialized payload is well under 100 KB.

### 4. Toolbar/Header callback identity — acceptable for MVP

`EditorHeader` receives `onBack` and `onMoreMenu`. Both are inline arrow functions defined inside `Editor`'s render body — they are new references every render. Since `EditorHeader` and `EditorToolbar` are not wrapped in `React.memo`, this is harmless: they re-render whenever `Editor` re-renders anyway. No gratuitous DOM updates occur because React's reconciler compares output, not prop identity, for non-memoised children. For a screen with fewer than 10 interactive elements this is entirely acceptable.

If these components were memoised for optimisation, the inline lambdas would defeat that. They are not, so no issue exists today.

### 5. `useEditorState` state shape — no unnecessary sub-component re-renders

The full editor state is a single flat object passed via `useReducer`. `Editor` reads individual fields and passes them as primitive or simple props to children. Sub-components re-render only when their specific props change. `EditorToolbar` re-renders when `isDirty` or `textAlign` changes, which is correct. The state shape does not force the whole tree to re-render on dialog open/close because `EditorBody` and `EditorToolbar` do not receive dialog state.

### 6. `useLayoutEffect` runs on every render — low impact

The cursor-restoration `useLayoutEffect` in `Editor.tsx` has no dep array, meaning it runs after every render. The guard `if (pendingCursorPos.current !== null && textareaRef.current)` makes the body a near-zero-cost branch in the common case (the ref is null almost always). Intentional: running after every render ensures it fires in the same paint frame as the time-insert dispatch. Acceptable.

### 7. `Intl.DateTimeFormat` formatter — module-level singleton

In `EditorBody.tsx` the formatter is instantiated once at module level:

```ts
const DATE_FMT = new Intl.DateTimeFormat('ko-KR', { ... });
```

Avoids re-constructing a `DateTimeFormat` object on every render. Correct.

### 8. `useDialogControl` cancel event listener — no leak

The `cancel` listener is attached only when `open=true` and removed in the effect cleanup, which fires when `open` flips to `false` or the component unmounts. The `onCloseRef` pattern ensures the listener never captures a stale `onClose`. No leak.

### 9. Route bundle size — 5.68 kB, negligible

Confirmed from the build output in the implementation report. No large third-party imports introduced. All new dependencies (`useReducer`, `useCallback`, `useMemo`, `useLayoutEffect`) are React built-ins with no bundle cost.

### 10. Hydration / first-paint

The editor renders unconditionally on first paint with empty fields (`isLoaded: false`). The textarea is visible immediately; content populates after the `useEffect` in `useEditorState` completes (one microtask cycle). For an existing entry there is a one-frame empty-field flash, accepted by design. No hydration mismatch risk because `readDiaries()` is only called inside `useEffect`, never at render time.

### 11. `readDiaries().find()` cost — negligible

`Array.find` over a diary array for a single-user app capped at 365 entries/year is O(n) with n < 1000 for any plausible usage. Negligible.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **Memoize `EditorHeader` and `EditorToolbar` if they grow.** Currently they receive new callback refs every render but are not `React.memo`-wrapped. Fine today. If either becomes more expensive (animation, complex DOM), wrap in `memo` and stabilise the callbacks with `useCallback` in `Editor`.

2. **`useLayoutEffect` dep array.** The no-dep-array `useLayoutEffect` for cursor restoration runs on every render. An alternative is to pass `[state.text]` as deps and accept the one-frame delay. Minor code-clarity improvement, not a performance issue.

3. **`upsertDiary` double-read on new entry creation.** Every save reads-then-writes. Unavoidable given current storage layer design. Not an issue at MVP scale; a write-only `appendDiary` for new entries would eliminate the read if revisited.

## Verdict
PASS

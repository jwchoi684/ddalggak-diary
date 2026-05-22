# Technical Design — REQ-010: 에디터 내 가로 캘린더 인라인 드롭다운

## Overview

The feature adds a collapsible horizontal date strip inside the diary editor. Tapping the date label (now a `<button>`) expands a scrollable row of day cells beneath it. Each cell shows either a `MoodIcon` (size 24) when a diary entry exists for that date, or a plain day number when it does not. The currently loaded date is highlighted with a peach pill. Tapping a different cell saves the current entry synchronously, then shifts `currentDate` state, which automatically triggers `useEditorState`'s existing `useEffect([date])` reload. No URL change, no router push, no new storage keys.

---

## Component / File Map

| File | Status | Target Lines | Responsibility |
|---|---|---|---|
| `src/lib/hooks/useHorizontalDatePicker.ts` | NEW | ~70 | Toggle open/close, build ±30-day date range, build entryMap from `readDiaries()`, expose `handleDateSelect` |
| `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` | NEW | ~60 | Scroll container, scroll-to-selected on open, renders `DateCell` array |
| `src/app/diary/[date]/_components/DateCell.tsx` | NEW | ~55 | Single cell: MoodIcon or number, selected pill, today dot |
| `src/app/diary/[date]/_components/Editor.tsx` | MODIFY | ~185 | Add `currentDate` state, wire `useHorizontalDatePicker`, pass new props to `EditorBody` |
| `src/app/diary/[date]/_components/EditorBody.tsx` | MODIFY | ~95 | Convert date `<p>` to `<button>`, render strip inline when `stripOpen` |
| `src/design-system/MoodIcon.tsx` | NO CHANGE | — | Used as-is with `size={24}` |
| `src/lib/hooks/useEditorState.ts` | NO CHANGE | — | `useEffect([date])` already handles date changes |
| `src/lib/storage/diaries.ts` | NO CHANGE | — | `readDiaries()` and `upsertDiary()` reused directly |

---

## Data Flow Diagram

```
[User taps date label ▾]
  → stripOpen: false → true
  → useHorizontalDatePicker: build dateRange (±30d) + entryMap (readDiaries())
  → HorizontalDatePicker mounts
  → useEffect: scrollRef.current.querySelector('[aria-selected=true]').scrollIntoView({ inline: 'center', block: 'nearest' })

[User taps a different DateCell]
  → handleDateSelect(newDate) called
  → try { saveFn(autosaveValue) }          ← synchronous localStorage write
      success:
        setCurrentDate(newDate)            ← triggers useEditorState useEffect([date])
        strip.close()                      ← stripOpen: true → false
        HorizontalDatePicker unmounts      ← {stripOpen && <...>} gate
        useEditorState useEffect fires:
          readDiaries().find(e.date === newDate)
          dispatch({ type: 'LOAD_ENTRY', entry })
            if entry → load mood/text/textAlign
            if no entry → isLoaded:true, moodSheetMode:'initial'
        MoodPickerSheet opens (moodSheetMode === 'initial')
      failure (QuotaExceededError):
        toast.show('저장에 실패했어요. 다시 시도해주세요.')
        keep stripOpen, keep currentDate unchanged

[Pending debounce timer fires later]
  → saveFn(autosaveValue) called again
  → upsertDiary with same persistedId → idempotent, no side-effect
```

---

## Exact Function Signatures

```ts
// src/lib/hooks/useHorizontalDatePicker.ts

export interface UseHorizontalDatePickerOptions {
  currentDate: string;                   // "YYYY-MM-DD"
  saveFn: (v: AutosaveValue) => void;    // same saveFn from Editor.tsx
  autosaveValue: AutosaveValue;          // { mood, text, textAlign }
  onDateChange: (newDate: string) => void; // calls setCurrentDate in Editor
  onSaveError: (msg: string) => void;    // calls toast.show(...)
}

export interface UseHorizontalDatePickerReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  dateRange: string[];                   // ISO strings, 61 items: -30d to +30d
  entryMap: Map<string, DiaryEntry>;     // date string → entry
  handleDateSelect: (newDate: string) => void;
}

export function useHorizontalDatePicker(
  opts: UseHorizontalDatePickerOptions
): UseHorizontalDatePickerReturn;
```

```ts
// src/app/diary/[date]/_components/HorizontalDatePicker.tsx

export interface HorizontalDatePickerProps {
  currentDate: string;
  dateRange: string[];
  entryMap: Map<string, DiaryEntry>;
  onDateSelect: (date: string) => void;
}

export function HorizontalDatePicker(props: HorizontalDatePickerProps): JSX.Element;
```

```ts
// src/app/diary/[date]/_components/DateCell.tsx

export interface DateCellProps {
  date: string;                          // "YYYY-MM-DD"
  entry: DiaryEntry | undefined;
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

export function DateCell(props: DateCellProps): JSX.Element;
```

```ts
// AutosaveValue (already in Editor.tsx, imported via type)
type AutosaveValue = { mood: MoodId | undefined; text: string; textAlign: 'left' | 'center' };
```

---

## Editor.tsx Integration Delta

```
// New state (after existing hooks)
const [currentDate, setCurrentDate] = useState(date);
  // Note: saveFn captures `date` in its useCallback deps.
  // After setCurrentDate, saveFn still refers to the OLD date
  // for any stale debounce fire — which is correct (saves old date's content).
  // The next render produces a new saveFn bound to currentDate.

// Replace: useEditorState(date) → useEditorState(currentDate)
// Replace: EditorBody date={date} → date={currentDate}
// Replace: MoodPickerSheet date={date} → date={currentDate}
// Replace: saveFn useCallback dep [... date ...] → [... currentDate ...]

const strip = useHorizontalDatePicker({
  currentDate,
  saveFn,
  autosaveValue,
  onDateChange: setCurrentDate,
  onSaveError: (msg) => toast.show(msg),
});

// Pass to EditorBody:
//   stripOpen={strip.isOpen}
//   onDateLabelTap={strip.toggle}
//   dateRange={strip.dateRange}
//   entryMap={strip.entryMap}
//   onDateSelect={strip.handleDateSelect}
//   (strip props passed only when needed — EditorBody renders HorizontalDatePicker internally)
```

Key change: `saveFn`'s `useCallback` dependency array must reference `currentDate` not `date`:

```ts
const saveFn = useCallback(
  (v: typeof autosaveValue) => {
    if (!v.mood) return;
    const id = state.persistedId ?? generateId();
    const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
    upsertDiary({ id, date: currentDate, mood: v.mood, text: v.text, textAlign: v.textAlign,
      photos: [], createdAt, updatedAt: new Date().toISOString() });
    dispatch({ type: 'MARK_SAVED', id, createdAt });
  },
  [state.persistedId, state.persistedCreatedAt, currentDate, dispatch],
);
```

`handleSaveAndBack` and `handleExplicitSave` need no changes — they call `saveFn(autosaveValue)` which now uses `currentDate`.

---

## EditorBody.tsx Integration Delta

New props added to `EditorBodyProps`:

```ts
stripOpen: boolean;
onDateLabelTap: () => void;
dateRange: string[];
entryMap: Map<string, DiaryEntry>;
onDateSelect: (date: string) => void;
```

Replace the `<p>` at line 68:

```tsx
{/* Date label — tappable, opens horizontal date strip */}
<button
  type="button"
  aria-expanded={stripOpen}
  aria-haspopup="listbox"
  aria-label="날짜 선택"
  onClick={onDateLabelTap}
  className="text-sm text-meta text-center mb-2 w-full flex items-center justify-center gap-1"
>
  <span>{formatDate(date)}</span>
  <span aria-hidden="true" style={{ display: 'inline-block', transform: stripOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
</button>

{stripOpen && (
  <HorizontalDatePicker
    currentDate={date}
    dateRange={dateRange}
    entryMap={entryMap}
    onDateSelect={onDateSelect}
  />
)}
```

The strip is inserted between the date button and the textarea. It pushes content down (reflow), not overlay. The `mb-4` on the old `<p>` moves to the textarea's top margin or is retained on the strip container.

---

## Visual Spec

### Strip container (`HorizontalDatePicker`)
- `display: flex`, `overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`
- No scrollbar visible: `scrollbar-width: none`, `::-webkit-scrollbar { display: none }`
- Height: `72px` fixed (single row)
- Background: `bg-cream` (matches editor background — no card shadow needed; strip is inline, not modal)
- Slide-down CSS transition on mount: `animate-[slideDown_150ms_ease-out]` — define `@keyframes slideDown { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }` in `globals.css`
- Padding: `px-2`

### Date cell (`DateCell`)
- Width: `44px` (meets minimum touch target)
- Height: `64px` (within 72px container, centered)
- `scroll-snap-align: center`
- Gap between cells: `4px`
- Layout: `flex flex-col items-center justify-center gap-1`

### Cell states

| State | Visual |
|---|---|
| No entry, not selected, not today | Day number (e.g. "22"), `text-sm text-charcoal` |
| Has entry, not selected | `MoodIcon size={24}` + day number below, `text-xs text-meta` |
| Selected (currentDate) | Peach pill background: `bg-peach rounded-full` on the whole 44×64 cell; text and icon remain |
| Today (when today ≠ currentDate) | 3px dot below the day number: `w-1 h-1 rounded-full bg-peach mx-auto mt-0.5` |
| Today + selected | Peach pill (selected takes priority; dot omitted since redundant) |

Day number format: `date.slice(-2).replace(/^0/, '')` (show "1"–"31", not "01")
Day of week label: optional `text-[10px] text-meta` above number (Mon/Tue etc.) — NOT included in MVP to keep cells clean and line count low.

### chevron animation
`transform: rotate(180deg)` when `stripOpen`, 150ms ease transition.

---

## Accessibility Spec

| Element | Role / Attribute |
|---|---|
| Date label `<button>` | `aria-expanded={stripOpen}` `aria-haspopup="listbox"` `aria-label="날짜 선택"` |
| Strip container `<div>` | `role="listbox"` `aria-label="가로 캘린더"` |
| Each cell `<button>` | `role="option"` `aria-selected={isSelected}` `aria-label="{ko-date-string}"` (e.g. "2026년 5월 22일") |
| Chevron `▾` span | `aria-hidden="true"` |

No ESC key handler needed — the strip is not modal. No outside-click-to-close; close-on-select is sufficient per UX decision below.

---

## Hydration and First-Paint Handling

`HorizontalDatePicker` accesses `readDiaries()` (localStorage) and `new Date()` (for today's date). Both are client-only.

The gate is already in place: `{stripOpen && <HorizontalDatePicker .../>}`. The strip is never mounted during SSR because `stripOpen` is `false` on initial render and the toggle button is only interactable in the browser. No additional `mounted` flag needed.

`useHorizontalDatePicker` computes `dateRange` and `entryMap` on mount (lazy init) so they are also client-only. The hook file has `"use client"` (all `_components/` and `lib/hooks/` files already carry it). `readDiaries()` returns `[]` during SSR per its own guard — harmless since the strip doesn't render server-side.

---

## Edge Case Resolutions

**Q1 — Strip range**: ±30 days centered on `currentDate`. 61-cell array: `dateRange[i] = addDays(currentDate, i - 30)` for i in 0..60. Re-derive via `useMemo([currentDate])` when `currentDate` changes so the strip recenters. No lazy loading.

**Q2 — Cell size and layout**: 44px wide × 64px tall cells. 4px gap. Total strip height 72px. `overflow-x: auto`, `scroll-snap-type: x mandatory`, each cell `scroll-snap-align: center`. No JS-controlled snap — CSS snap is sufficient and performant.

**Q3 — Cell visual**: Entry present: `MoodIcon size={24}` centered, day number (1–2 digits) below in `text-xs text-meta`. No entry: day number only in `text-sm text-charcoal` centered. Selected: peach pill `bg-peach` on full cell. Today (not selected): 3px peach dot below number. Entry-with-no-mood: render `•` as a text placeholder character centered at 24px line-height; never crash.

**Q4 — Initial scroll position**: `useEffect` inside `HorizontalDatePicker` on mount fires `scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' })`. Use `behavior: 'instant'` to avoid animate-then-scroll jank on open. Fallback: if no selected cell found, do nothing.

**Q5 — Toggle UI**: Tap date label → toggle `isOpen`. Tap date cell → `handleDateSelect` → close strip after save succeeds. No ESC handler. No outside-click-to-close (strip is inline, not a popover — it pushes content down and stays visible intentionally). If user taps same (already selected) date → no-op save call (`saveFn` with no mood returns early, with mood saves idempotently), then close strip.

**Q6 — Save flow on date switch**:
```
a) try { saveFn(autosaveValue) }         // synchronous
b) setCurrentDate(newDate)               // triggers LOAD_ENTRY via useEffect
   strip.close()                         // {stripOpen && ...} unmounts strip
c) catch(e) {
     toast.show('저장에 실패했어요. 다시 시도해주세요.')
     // do NOT setCurrentDate, do NOT close strip
   }
d) if state.mood is undefined, saveFn returns early (no throw) → proceed to step b
```
No async/await. No `Promise.resolve()`. `upsertDiary` throws synchronously on `QuotaExceededError`.

**Q7 — Hydration safety**: Strip component never renders server-side. `{stripOpen && <HorizontalDatePicker/>}` — `stripOpen` initializes to `false` in `useState`, which is the same on server and client. No hydration mismatch.

**Q8 — Memoization**: `dateRange`: `useMemo(() => buildDateRange(currentDate), [currentDate])` inside `useHorizontalDatePicker`. `entryMap`: `useMemo(() => buildEntryMap(readDiaries()), [isOpen])` — recomputes on each open, ensuring fresh data after autosave. Both in the same hook file.

**Q9 — ARIA spec**: Resolved in Accessibility Spec section above.

**Q10 — EditorBody prop coupling**: Tight coupling — `HorizontalDatePicker` renders inside `EditorBody`. It is an editor-specific component, lives in `_components/`, and has no other consumer. `EditorBody` receives `stripOpen`, `onDateLabelTap`, `dateRange`, `entryMap`, `onDateSelect` as explicit props. No `stripSlot` render prop.

**Q11 — Closed strip**: `{stripOpen && <HorizontalDatePicker .../>}` — strip is not mounted when closed. 61 cells are not built when the strip is hidden.

**Q12 — Saving with no mood**: `saveFn` early-returns when `v.mood` is falsy. Text typed without selecting a mood is lost when the user switches dates. This matches REQ-009's existing behavior and is explicitly accepted. No fix attempted here.

---

## Test Hooks

Tests will locate elements by these selectors / labels:

| Element | Locator |
|---|---|
| Date toggle button | `aria-label="날짜 선택"` |
| Strip container | `role="listbox"` |
| Any date cell | `role="option"` |
| Selected date cell | `role="option"` + `aria-selected="true"` |
| Specific date cell | `aria-label="2026년 5월 22일"` |
| Save failure toast | Text matching `"저장에 실패했어요"` |

Unit test matrix:
1. Toggle button click → strip mounts; click again → unmounts.
2. Cell tap on unselected date: `saveFn` called → `onDateChange` called → strip closed.
3. Cell tap when `saveFn` throws `QuotaExceededError`: `onSaveError` called, `onDateChange` NOT called.
4. Cell renders `MoodIcon` when `entryMap` has entry for that date; renders day number otherwise.
5. Selected cell has `aria-selected="true"`.
6. Today's cell has dot indicator when `isToday && !isSelected`.
7. Same-date tap → save called but `onDateChange` not called (no-op navigation). (Or strip closes only — implementation detail to settle in code.)

E2E (Playwright):
1. Editor for date A (with entry) → open strip → tap date B → verify date A entry persists in localStorage → verify editor now shows date B's content.
2. Editor with unsaved text + no mood → tap date B → date B loads, date A text not saved (no entry created).

---

## Non-Goals (Critical Restatement)

- Month/year picker — deferred to P1. No "jump to month" UI.
- Virtual scroll — explicitly excluded. 61 static cells are fine.
- URL sync during date navigation — explicitly prohibited. URL stays at original date.
- Outside-click dismiss — not implemented. Close-on-select only.
- Swipe gesture navigation — out of scope; CSS scroll handles touch natively.
- Confirm dialog before date switch — autosave is silent. Error toast only on failure.
- Photo carousel / full-screen photo viewer — REQ-011/012.

---

## Backward Compatibility

- `Editor.tsx` changes `date` prop usage to `currentDate` state internally. The external prop signature `EditorProps { date: string }` is unchanged — callers (page.tsx) need no updates.
- `EditorBody.tsx` adds new optional-feeling props but they are required in the updated interface. The single call site (Editor.tsx) is updated simultaneously — no other consumer.
- No new localStorage keys; no schema changes; no migration needed.
- Existing `useEditorState`, `useAutosave`, `saveFn` behavior is unchanged for non-strip usage paths.

---

## Performance Considerations

- 61 `DateCell` nodes are lightweight (each is a `<button>` with at most one `<img>`-equivalent emoji). No virtualization needed.
- `readDiaries()` on strip open: O(n) over diary entries. For a 1-year active user, n ≈ 365. Negligible.
- `entryMap` recomputes only when `isOpen` changes (on open), not on every render.
- CSS `scroll-snap` offloads scroll physics to the browser compositor — no JS scroll listeners.
- Strip is not mounted when closed — zero render cost when hidden.

---

## Infra / Deployment Considerations

None. All changes are client-side React components. No new API routes, no new environment variables, no build configuration changes. Existing Next.js App Router setup handles the new `"use client"` files automatically.

---

## Risks and Tradeoffs

| Risk | Severity | Mitigation |
|---|---|---|
| `saveFn` captures stale `currentDate` in `useCallback` if deps not updated | High | Change `saveFn` dep from `date` to `currentDate` (called out in Editor.tsx delta) |
| Debounce fires after `setCurrentDate` with new date's `saveFn` — writes wrong date's content to new date | Medium | The debounce timer fires the OLD `saveFn` (closure captured before `setCurrentDate`). React state update is async-scheduled; the closure is already bound. This is safe. |
| URL mismatch (URL shows original date, editor shows navigated date) | Low | Expected and intentional per PRD. Document in code comment. |
| `Editor.tsx` already 171 lines; delta adds ~15 lines | Low | New logic extracted to `useHorizontalDatePicker` hook — Editor.tsx grows modestly to ~185 lines |
| `entryMap` stale if another tab writes localStorage | Very Low | Strip is a single-tab app; stale risk is negligible. Recompute on open covers normal usage. |

---

## Open Questions

None. All 12 specified decisions are closed above.

---

## Verdict
PASS

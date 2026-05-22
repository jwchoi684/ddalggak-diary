# Architecture Report — REQ-010

## Summary

REQ-010 adds an inline horizontal date-strip that slides down inside the diary editor when the user taps the date label (with `▾` chevron). The strip shows up to 7–10 days, uses the existing `MoodIcon` component for cells with entries, and performs a save-then-load sequence when the user taps a different date. All dependencies (REQ-002, REQ-003, REQ-005, REQ-009) are DONE. The architecture is solid and integration is well-defined with no blocking gaps.

---

## Codebase Map (paths reviewed)

- `src/design-system/MoodIcon.tsx`
- `src/design-system/moods.ts`
- `src/design-system/BottomSheet.tsx`
- `src/design-system/Card.tsx`
- `src/design-system/Toast.tsx`
- `src/design-system/useToast.ts`
- `src/app/globals.css`
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/app/diary/[date]/_components/EditorHeader.tsx`
- `src/app/diary/[date]/_components/EditorToolbar.tsx`
- `src/app/diary/[date]/page.tsx`
- `src/app/diary/[date]/__tests__/Editor.test.tsx`
- `src/lib/hooks/useEditorState.ts`
- `src/lib/hooks/useAutosave.ts`
- `src/lib/hooks/__tests__/useEditorState.test.ts`
- `src/lib/hooks/__tests__/useAutosave.test.ts`
- `src/lib/storage/diaries.ts`
- `src/lib/storage/useDiaries.ts`
- `src/lib/storage/types.ts`
- `src/lib/navigation/routes.ts`
- `src/app/_components/CalendarDayCell.tsx`

---

## Findings on Each Numbered Topic

### 1. Design System Primitives

**MoodIcon** (`src/design-system/MoodIcon.tsx`, lines 15–19):
- Props: `id: MoodId`, `size: number`, `className?: string`
- `size` is a raw pixel number (integer), NOT a string enum. It sets `width`, `height`, and `fontSize` simultaneously via inline style.
- The calendar (`CalendarDayCell.tsx` line 48) uses `size={32}`. The editor's `EditorBody.tsx` (line 55) uses `size={72}`.
- For the horizontal date strip, the design agent must specify `size={24}` or `size={28}` — a plain integer. There is no named small/medium/large variant; any integer is valid. Consistency with the calendar "small" use (32px) is the reference floor.

**Horizontal scroll / chip patterns**: No existing scroll container, chip, or pill component exists in `src/design-system/`. The feature will need new components.

**Tokens** (from `globals.css`):
- `--color-cream: #FAF6EE`, `--color-charcoal: #2A2A2A`, `--color-peach: #F5C896`, `--color-meta: #A8A8A8`, `--color-paper: #FFFFFF`
- `--radius-card: 16px`, `--radius-card-lg: 20px`, `--shadow-card: 0 2px 8px rgba(0,0,0,0.04)`
- These tokens are exposed as Tailwind utility classes: `bg-cream`, `text-charcoal`, `bg-peach`, `text-meta`, `bg-paper`, `rounded-[var(--radius-card)]`

**BottomSheet**: Uses `<dialog>` with `showModal()` — not applicable for inline strip. The strip is not modal; do not reuse BottomSheet for it.

**Card**: Available with `large` prop (20px radius vs 16px). Could wrap the strip container if a card visual is desired, but it is a server component, so it is usable in RSC contexts too.

**Toast / useToast**: Available for save-failure handling. `toast.show(message)` accepts optional `durationMs`. Use `role="alert"` for error case per `ToastProps`. The existing `Toast` instance in `Editor.tsx` (line 122) must be reused — do not add a second `Toast` mount. Pass the failure message through the existing `toast.show()` call.

### 2. Editor Component Analysis

**Date display location** (`EditorBody.tsx`, line 68–70):
```tsx
<p className="text-sm text-meta text-center mb-4">
  {formatDate(date)} ▾
</p>
```
The `▾` is already present as a static character in the markup, with a JSX comment `{/* Date label (▾ is inert — REQ-010 hooks in here) */}`. This is the exact attachment point. The `<p>` must become a `<button>` (or wrap a `<button>`) to be tappable. `EditorBody` will need two new props: `stripOpen: boolean` and `onDateLabelTap: () => void`.

**saveFn shape and location** (`Editor.tsx`, lines 40–52):
```tsx
const saveFn = useCallback(
  (v: typeof autosaveValue) => {
    if (!v.mood) return;
    const id = state.persistedId ?? generateId();
    const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
    upsertDiary({ id, date, mood: v.mood, text: v.text, textAlign: v.textAlign, ... });
    dispatch({ type: 'MARK_SAVED', id, createdAt });
  },
  [state.persistedId, state.persistedCreatedAt, date, dispatch],
);
```
`saveFn` lives inside `Editor.tsx` and is a `useCallback`. It is already called imperatively in `handleSaveAndBack` (line 75) and `handleExplicitSave` (line 80), so calling it synchronously before a date switch is the correct and established pattern. The date-switch handler must call `saveFn(autosaveValue)` then dispatch a `LOAD_ENTRY` for the new date — no need to lift or ref this function.

**No `flush` on useAutosave**: `useAutosave` (line 22–26) is a bare `useEffect` with `setTimeout` — there is no `flush()` method. To avoid data loss when the debounce timer is mid-flight, the date-switch handler must call `saveFn(autosaveValue)` directly (which is the synchronous eager-save path, identical to `handleExplicitSave`). The in-flight debounce timer will fire later but `upsertDiary` is idempotent (same `persistedId`) and harmless. This is the cleanest approach; no timer cancellation API is needed.

**LOAD_ENTRY with date change** (`useEditorState.ts`, lines 101–109):
```tsx
export function useEditorState(date: string): [EditorState, Dispatch<EditorAction>] {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  useEffect(() => {
    const entry = readDiaries().find((e) => e.date === date);
    dispatch({ type: 'LOAD_ENTRY', entry });
  }, [date]);
  return [state, dispatch];
}
```
The `date` prop is a dependency of the `useEffect`. When `date` changes, `LOAD_ENTRY` fires automatically. This means if the `Editor` component receives a new `date` prop, it will reload state correctly without remounting. HOWEVER, `Editor.tsx` currently receives `date` from the Next.js page route param and passes it to `useEditorState`. The `date` prop on `Editor` never changes during the component's lifetime (it comes from the URL). For the date-strip, we need `date` to change while keeping the Editor mounted.

**Two approaches are possible**:
1. Move `date` into a `useState` inside `Editor.tsx` (initialized from the prop, mutable during strip navigation). The `useEditorState(date)` hook already supports re-firing on date change — this would work with no hook changes.
2. Alternatively, dispatch `LOAD_ENTRY` directly from the strip's selection handler by reading the new entry from storage and dispatching manually, bypassing the `useEditorState` hook's `useEffect`. This is messier and couples the strip to internal hook dispatch semantics.

Approach 1 is clean. `Editor.tsx` changes: `const [currentDate, setCurrentDate] = useState(date);` and passes `currentDate` everywhere `date` was used. The strip handler calls `setCurrentDate(newDate)` after saving.

### 3. Storage Layer

**readDiaries()** (`src/lib/storage/diaries.ts`, line 13): Returns `DiaryEntry[]`. No `Map<date, entry>` helper exists. The strip component must build its own date-to-entry lookup by calling `readDiaries()` and using `Array.find` or constructing a `Map` locally.

**useDiaries()** (`src/lib/storage/useDiaries.ts`): Reads once on mount, returns `{ entries, isReady }`. The strip can use this hook to get the full entry list on mount and build its lookup map. No new storage keys are needed.

**No index helper exists**: The design agent must specify building a local `Map<string, DiaryEntry>` from `readDiaries()` results inside the strip hook, e.g. `new Map(entries.map(e => [e.date, e]))`.

### 4. Calendar MoodIcon Size

`CalendarDayCell.tsx` line 48: `<MoodIcon id={entry.mood} size={32} />`. The strip cells should match or be slightly smaller (24–28px) to fit the tighter horizontal cell layout. The design agent should specify `size={24}` for strip cells given their constrained width (~44px touch target).

### 5. Navigation / Routing

`Editor.tsx` uses `useRouter()` from `next/navigation` for `router.back()` and `router.push(Routes.list)`. These are navigation events to other screens — not involved in the date-strip switch. The strip switch is pure state: call `saveFn`, then `setCurrentDate(newDate)`. No `router.push`, no `router.replace`, no URL mutation. This satisfies REQ-010's invariant 5 ("inline — no history-stack push, no URL change").

`Routes` in `src/lib/navigation/routes.ts` does not need to change.

### 6. Existing Tests

- `Editor.test.tsx` uses `vi.useFakeTimers()` + `act(() => { vi.advanceTimersByTime(1000); })` for autosave testing — this pattern applies directly to testing the flush-before-switch sequence.
- `useEditorState.test.ts` uses `renderHook` with direct `dispatch` calls and tests `LOAD_ENTRY` firing on initial mount. Tests for date-change re-loading would follow the same `renderHook({ initialProps: { date: 'YYYY-MM-DD' } })` + `rerender({ date: '...' })` pattern.
- No scrollable-strip or IntersectionObserver tests exist. The strip uses CSS `overflow-x: auto` (no IntersectionObserver needed), so no new testing infrastructure is required.
- Mocking setup: `setupNextNavigation.ts` exposes `mockRouter` with `replace` already mocked alongside `push` and `back` — available if needed, though the strip won't call it.

---

## Concrete Integration Points

| File | Change Required |
|---|---|
| `src/app/diary/[date]/_components/EditorBody.tsx` (84 lines) | Add `stripOpen: boolean` + `onDateLabelTap: () => void` props. Convert date `<p>` to a tappable `<button>`. Render `<HorizontalDatePicker>` below date line when `stripOpen`. |
| `src/app/diary/[date]/_components/Editor.tsx` (171 lines — ALREADY OVER 100) | Add `useState(date)` for `currentDate`. Add `stripOpen` state. Wire `handleDateSwitch(newDate)` which calls `saveFn(autosaveValue)` then `setCurrentDate(newDate)`. Pass `stripOpen` and `onDateLabelTap` to `EditorBody`. |
| `src/lib/hooks/useEditorState.ts` (110 lines — ALREADY OVER 100) | No code change required; the hook already responds to `date` param changes via `useEffect([date])`. |
| `src/design-system/MoodIcon.tsx` | No change. Used as-is with `size={24}` in strip cells. |

New files to create (all under the 100-line budget individually):
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` — scroll container + maps date range to cells
- `src/app/diary/[date]/_components/DateCell.tsx` — single cell: `MoodIcon` or numeric, highlight logic
- `src/lib/hooks/useHorizontalDatePicker.ts` — toggle state + date range generation + entry map lookup

---

## Architecture Constraints That Must Be Honored

1. `saveFn` must be called synchronously before `setCurrentDate(newDate)`. No async gap between save and state transition — both are synchronous (localStorage is synchronous).
2. `LOAD_ENTRY` dispatches from `useEditorState`'s `useEffect` when `date` changes — this is automatic if `currentDate` state is used. The strip must NOT dispatch `LOAD_ENTRY` directly (that would bypass the hook's single-load gate).
3. `MoodIcon` called with `size` as a plain integer (e.g. `size={24}`). No string variant name.
4. No new localStorage keys. Strip reads `readDiaries()` and constructs a transient in-memory lookup.
5. Save-failure handling: catch `QuotaExceededError` from `upsertDiary`, call `toast.show('저장에 실패했어요...', undefined, 'alert')` — reuse the existing `toast` instance in `Editor.tsx`. Block `setCurrentDate` on failure.
6. Korean strings only for all user-visible text (aria-labels, labels).
7. All new files under ~100 lines. `Editor.tsx` is already at 171 lines — any additions should extract rather than inline.

---

## Risks Specific to This Architecture

**Data loss during debounce mid-flight**: `useAutosave` has no flush method. The date-switch handler must call `saveFn(autosaveValue)` eagerly (same pattern as `handleExplicitSave`). The pending debounce timer will then fire a duplicate save — harmless because `upsertDiary` is idempotent. This is safe by design but must be explicitly documented in the implementation.

**`currentDate` vs URL mismatch**: Once `currentDate` state diverges from the URL path param, the browser URL stays stale (e.g. URL shows `/diary/2026-05-20` while the editor shows May 22nd's entry). This is intentional per REQ-010 (no URL change), but it means the back button will navigate to whatever was before `/diary/2026-05-20` on the stack, not return to May 20th. This is correct behavior per the PRD's history-stack model. The implementation must NOT use `router.replace` to keep the URL in sync — that would still push a history entry and break the expected back behavior.

**`useDiaries` reads only on mount**: If the strip is mounted while the user is mid-session and has saved an entry (via autosave), the in-memory entry map built from `useDiaries` may be stale for the current date. The strip hook should call `readDiaries()` directly (not `useDiaries`) to get the freshest view on each render or on each strip-open event. This avoids a one-time stale snapshot problem.

**`Editor.tsx` file size**: Already at 171 lines. Adding `currentDate` state, `stripOpen` state, and `handleDateSwitch` will push it further. The 100-line rule is already violated; extraction (e.g., pulling date-switch logic into `useHorizontalDatePicker`) is required to keep the file manageable.

**`useEditorState.ts` file size**: Already at 110 lines. No new code goes here, but it's on the radar.

---

## Suggested Component/File Structure for the New Feature

```
src/app/diary/[date]/_components/
  HorizontalDatePicker.tsx       # scroll container, maps date range → DateCell array
  DateCell.tsx                   # single cell: MoodIcon (size=24) or day number, highlight

src/lib/hooks/
  useHorizontalDatePicker.ts     # toggle open/close, build ±30-day range, build date→entry Map
                                 # exposes: isOpen, toggle(), dateRange, entryMap
```

`Editor.tsx` changes (kept minimal — delegate logic to `useHorizontalDatePicker`):
- `const [currentDate, setCurrentDate] = useState(date);`
- `const strip = useHorizontalDatePicker(currentDate);`
- `handleDateSwitch(newDate)`: `try { saveFn(autosaveValue); setCurrentDate(newDate); strip.close(); } catch { toast.show('저장에 실패했어요...'); }`

`EditorBody.tsx` changes:
- Add `stripOpen`, `onDateLabelTap`, `onDateSelect`, `stripEntries` props (or accept the strip node as a `stripSlot` render prop to avoid coupling).
- Convert the date `<p>` at line 68 to a `<button>` with `aria-label="날짜 선택"`.
- Render `<HorizontalDatePicker>` between the date line and the textarea when `stripOpen`.

---

## Verdict
PASS

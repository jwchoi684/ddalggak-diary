# API / Interface Contract — REQ-010

## Summary

REQ-010 is a pure client-side React feature with no HTTP, RPC, WebSocket, or queue boundaries. This contract defines the TypeScript interface and behavioral contracts for five units: one new hook, two new components, and two modified components. It also states the read-only storage contracts this feature depends on.

---

## Contract Type

Component and hook interface contracts (TypeScript, React, client-side only).

---

## Interfaces

### 1. `useHorizontalDatePicker(opts)` — NEW hook

**File:** `src/lib/hooks/useHorizontalDatePicker.ts`

```ts
export interface UseHorizontalDatePickerOptions {
  currentDate: string;                        // "YYYY-MM-DD", caller maintains
  saveFn: (v: AutosaveValue) => void;         // synchronous; throws on QuotaExceededError
  autosaveValue: AutosaveValue;               // { mood: MoodId | undefined; text: string; textAlign: 'left' | 'center' }
  onDateChange: (newDate: string) => void;    // called only on successful save
  onSaveError: (msg: string) => void;         // called with Korean error string on save failure
}

export interface UseHorizontalDatePickerReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  dateRange: string[];                        // 61 ISO date strings: currentDate −30d to +30d, ascending
  entryMap: Map<string, DiaryEntry>;          // keyed by "YYYY-MM-DD"; at most one entry per key
  handleDateSelect: (newDate: string) => void;
}

export function useHorizontalDatePicker(
  opts: UseHorizontalDatePickerOptions
): UseHorizontalDatePickerReturn;
```

**Caller responsibilities:**
- `currentDate` must be a valid ISO date string in "YYYY-MM-DD" format.
- `saveFn` must be the same function reference produced by `Editor.tsx`'s `useCallback`; its `useCallback` deps array must include `currentDate` (not the stale URL `date` prop).
- `autosaveValue` must reflect the current editor field values at the moment `handleDateSelect` is called (not a snapshot from a previous render).
- `onDateChange` must call `setCurrentDate` in `Editor.tsx`; it must not be called if save throws.
- `onSaveError` must route to the existing `toast.show()` instance in `Editor.tsx` — do not mount a second `<Toast>`.

**Callee guarantees:**
- `handleDateSelect(newDate)` always calls `saveFn(autosaveValue)` first (synchronously), then calls `onDateChange(newDate)` and `close()` only if `saveFn` does not throw.
- If `saveFn` throws, calls `onSaveError(msg)` and leaves `isOpen` true and `currentDate` unchanged.
- Tapping the same date as `currentDate` results in a no-op save call (which returns early when mood is undefined) followed by `close()` — `onDateChange` is NOT called for same-date taps.
- `dateRange` is derived via `useMemo([currentDate])` — re-derived whenever `currentDate` changes.
- `entryMap` is derived via `useMemo([isOpen])` — recomputes fresh from `readDiaries()` on each strip open; stale data between opens is accepted by design.

**Invariants callers MUST honor:**
- Do not call `handleDateSelect` with a non-ISO string.
- Do not mutate the returned `dateRange` array or `entryMap`.
- `onDateChange` must be stable across renders (wrap in `useCallback` or use `useState` setter directly).

---

### 2. `<HorizontalDatePicker>` — NEW component

**File:** `src/app/diary/[date]/_components/HorizontalDatePicker.tsx`

```ts
export interface HorizontalDatePickerProps {
  currentDate: string;                        // "YYYY-MM-DD"
  dateRange: string[];                        // 61 items, ascending — from useHorizontalDatePicker
  entryMap: Map<string, DiaryEntry>;
  onDateSelect: (date: string) => void;       // routes to handleDateSelect
}

export function HorizontalDatePicker(props: HorizontalDatePickerProps): JSX.Element;
```

**Caller responsibilities:**
- Rendered only when `stripOpen === true` (inside `{stripOpen && <HorizontalDatePicker .../>}` gate in `EditorBody`). Component assumes it is always mounted in an open state.
- `dateRange` must be sorted ascending; `dateRange[0]` is the earliest date.
- `onDateSelect` must be stable across renders (is `handleDateSelect` from hook, which is stable).

**Callee guarantees:**
- On mount, fires a `useEffect` that calls `scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' })`. Fails silently if no selected element found.
- Renders a `div` with `role="listbox"` and `aria-label="가로 캘린더"`.
- Does not mount during SSR (`stripOpen` initializes to `false`; no additional `mounted` flag required).
- Maps `dateRange` to `<DateCell>` items; passes `entry={entryMap.get(date)}` (may be `undefined`).

---

### 3. `<DateCell>` — NEW component

**File:** `src/app/diary/[date]/_components/DateCell.tsx`

```ts
export interface DateCellProps {
  date: string;                               // "YYYY-MM-DD"
  entry: DiaryEntry | undefined;              // undefined when no diary exists for this date
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

export function DateCell(props: DateCellProps): JSX.Element;
```

**Caller responsibilities:**
- `isSelected` must be `date === currentDate`.
- `isToday` must be `date === new Date().toISOString().slice(0, 10)` (computed once per strip render, not per cell).
- `onSelect` is the same `onDateSelect` from the parent — must be stable.

**Callee guarantees:**
- Renders a `<button>` with `role="option"`, `aria-selected={isSelected}`, `aria-label` in Korean (e.g., `"2026년 5월 22일"`).
- When `entry` is defined and `entry.mood` is a valid `MoodId`: renders `<MoodIcon id={entry.mood} size={24} />` centered, day number below in `text-xs text-meta`.
- When `entry` is defined but `entry.mood` is falsy: renders `•` placeholder at 24px line-height — never crashes.
- When `entry` is undefined: renders day number only in `text-sm text-charcoal`, centered.
- Selected state: applies `bg-peach rounded-full` to the full 44×64px cell.
- Today (not selected): renders a `w-1 h-1 rounded-full bg-peach` dot below the day number.
- Today + selected: peach pill only; dot omitted.
- Day number format: `date.slice(-2).replace(/^0/, '')` — "1"–"31", never zero-padded.
- Does NOT call `onSelect` when `isSelected` is true (same-date no-op is handled by the hook; the component may still call `onSelect(date)` and rely on the hook to ignore it).

---

### 4. `<EditorBody>` props — MODIFIED

**File:** `src/app/diary/[date]/_components/EditorBody.tsx`

New props added to `EditorBodyProps`:

```ts
stripOpen: boolean;
onDateLabelTap: () => void;
dateRange: string[];
entryMap: Map<string, DiaryEntry>;
onDateSelect: (date: string) => void;
```

All five props are required in the updated interface. The single call site (`Editor.tsx`) is updated simultaneously.

**Caller responsibilities (Editor.tsx):**
- Pass `strip.isOpen`, `strip.toggle`, `strip.dateRange`, `strip.entryMap`, `strip.handleDateSelect` directly from the hook return value.
- All five props must always be provided — no partial application.

**Callee guarantees (EditorBody):**
- The existing date `<p>` at line 68 is replaced with a `<button type="button" aria-expanded={stripOpen} aria-haspopup="listbox" aria-label="날짜 선택">`.
- When `stripOpen` is true, renders `<HorizontalDatePicker currentDate={date} dateRange={dateRange} entryMap={entryMap} onDateSelect={onDateSelect} />` between the date button and the textarea.
- Strip is inline (reflow, not overlay) — pushes textarea content down.
- Chevron `▾` rotates 180° when `stripOpen` via CSS transform with 150ms transition.

**Backward compatibility:**
- The external call site is only `Editor.tsx`. No other consumer of `EditorBody` exists. Both files are updated in the same commit.
- Removing or renaming any of the five new props is a breaking change to that single call site.

---

### 5. `<Editor>` internal state — MODIFIED (external props unchanged)

**File:** `src/app/diary/[date]/_components/Editor.tsx`

External prop signature `EditorProps { date: string }` is **unchanged**. The page component (`src/app/diary/[date]/page.tsx`) requires no updates.

New internal state:

```ts
const [currentDate, setCurrentDate] = useState(date);
// date = URL route param (never changes during component lifetime)
// currentDate = mutable, tracks strip navigation
```

**Invariants:**
- All locations that previously referenced the `date` prop for data operations must switch to `currentDate`: `useEditorState(currentDate)`, `saveFn`'s `upsertDiary` call, and `saveFn`'s `useCallback` dep array.
- `handleSaveAndBack` and `handleExplicitSave` need no changes — they call `saveFn(autosaveValue)` which now closes over `currentDate`.
- URL stays at original `date` (stale by design). No `router.replace` to sync URL.
- The existing `toast` instance in `Editor.tsx` is reused for save-failure messages from the strip — no second `<Toast>` mounted.

---

## Storage Contracts Read

This feature reads from `localStorage` via existing storage functions. It does NOT write directly; writes occur only through the reused `saveFn`.

| Function | Contract |
|---|---|
| `readDiaries(): DiaryEntry[]` | Returns all diary entries from `localStorage` key `ddalkkak:diaries:v1`. Each entry conforms to the REQ-002 schema: `{ id, date: "YYYY-MM-DD", mood: MoodId, text: string, textAlign: 'left'|'center', photos: string[], createdAt: string, updatedAt: string }`. Returns `[]` on SSR or parse failure. Must not throw. |
| `upsertDiary(entry: DiaryEntry): void` | Already used by `saveFn` (REQ-009). This feature does NOT call `upsertDiary` directly. The hook calls `saveFn(autosaveValue)`, which internally calls `upsertDiary`. May throw `DOMException` with name `"QuotaExceededError"` on storage full. |

No new localStorage keys are introduced. No schema migration required.

---

## Caller Invariants

1. `dateRange` passed to `<HorizontalDatePicker>` MUST be sorted ascending (earliest date first).
2. `entryMap` MUST contain at most one `DiaryEntry` per date key.
3. `onDateSelect` / `onDateChange` / `onSaveError` callbacks MUST be stable across renders (use `useCallback` or `useState` setters).
4. `saveFn` MUST close over `currentDate` (not the stale URL `date` prop) — `saveFn`'s `useCallback` dep array MUST include `currentDate`.
5. `autosaveValue` passed to `useHorizontalDatePicker` MUST reflect live editor field values at call time, not a stale snapshot.
6. `<HorizontalDatePicker>` MUST only be mounted when `stripOpen === true` (via `{stripOpen && ...}` gate) — it must never render server-side.
7. `isSelected` prop on `<DateCell>` MUST equal `date === currentDate` — no other heuristic.
8. `isToday` prop on `<DateCell>` MUST be computed from the system date at strip-open time, not at module load time.
9. The existing `<Toast>` instance in `Editor.tsx` MUST be reused for strip save-failure messages — a second `<Toast>` mount is forbidden.
10. `handleDateSelect` MUST call `saveFn` before calling `onDateChange` — order is non-negotiable to prevent data loss.
11. `setCurrentDate(newDate)` MUST NOT be called if `saveFn` throws — no optimistic navigation.
12. All user-visible strings (aria-labels, toast messages, UI copy) MUST be Korean.

---

## Backward Compatibility Statement

- `Editor` external props (`EditorProps { date: string }`): **unchanged**. Zero impact on `page.tsx`.
- `EditorBody` adds five required props. The only caller is `Editor.tsx`, updated in the same commit. No other consumer exists.
- `useEditorState` and `useAutosave`: no changes.
- `MoodIcon`, `Toast`, `useToast`, `readDiaries`, `upsertDiary`: no changes.
- No new `localStorage` keys; no schema migration.
- New files (`HorizontalDatePicker.tsx`, `DateCell.tsx`, `useHorizontalDatePicker.ts`) have no existing callers — no backward-compat burden.

---

## Verdict
PASS

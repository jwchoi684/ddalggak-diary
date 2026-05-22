# Technical Design — REQ-009

## Summary

REQ-009 delivers the diary editor: a single "use client" React component tree that handles both new-entry creation and existing-entry editing under the same route `src/app/diary/[date]/`. The route stub (already a Next.js 15 async server component with date validation) is kept as-is; it gains one line: rendering `<Editor date={date} />`. All editor logic lives in route-scoped `_components/` files and two shared hooks. No new third-party dependencies. No backend changes. No schema changes (`DiaryEntry.textAlign` is already present as a required field).

Six open unknowns from the architecture report are resolved in this design (detailed in Implementation Strategy below).

---

## Implementation Strategy

### Decision log — closing the six architecture unknowns

**Unknown 1 — `ConfirmDialog` missing `title` prop.**
Decision: option (a) — embed all copy in `message` as a single string. Do not add a `title?` prop to `ConfirmDialog` and do not create a new component. The design-system surface stays unchanged.

Concrete copy:
- Unsaved-changes guard: `message="저장되지 않은 변경사항이 있어요. 저장하고 나가시겠어요?"` / `confirmLabel="저장하고 나가기"` / `cancelLabel="계속 작성"`
- Delete confirm: `message="일기를 삭제할까요? 삭제한 일기는 복구할 수 없어요."` / `confirmLabel="삭제"` / `cancelLabel="취소"` / `destructive={true}`

**Unknown 2 — Hydration flash before storage read.**
Decision: render the editor shell unconditionally. The textarea starts empty. Once `readDiaries()` returns inside `useEffect`, a `LOAD_ENTRY` action populates all fields. The `isLoaded` flag is `false` until that action fires. `isDirty` is defined as `false` when `!isLoaded` — this prevents the back-guard from triggering before load completes. For a new entry the empty state IS the correct initial state, so there is no visible flash. For an existing entry the textarea is blank for one paint frame; this is acceptable for MVP.

**Unknown 3 + 6 — Textarea keyboard avoidance / toolbar sticky positioning.**
Decision: CSS-only, no `visualViewport` JS. Layout is a full-height flex column:
```
<main class="flex flex-col h-[100dvh] bg-cream">
  <EditorHeader />                   /* fixed height */
  <EditorBody class="flex-1 overflow-y-auto" />
  <EditorToolbar class="sticky bottom-0 bg-paper border-t pb-[env(safe-area-inset-bottom,0px)]" />
</main>
```
`100dvh` shrinks with the keyboard on modern iOS/Chrome. `sticky bottom-0` keeps the toolbar at the bottom of the scroll container. `env(safe-area-inset-bottom,0px)` covers iPhone notch padding.

**Unknown 4 — E2E localStorage seeding.**
Decision: `page.addInitScript(fn)` runs in the page context before any page script. Define `e2e/_helpers/seedDiaries.ts` exporting a function returning the serialized fixture data. The E2E test calls `await page.addInitScript(seedFn)` before `await page.goto(url)`.

**Unknown 5 — `MoodPickerSheet` Escape / `useDialogControl` NB-1.**
Decision: fix `useDialogControl` as part of this REQ. Add a `cancel` event listener that calls `onClose` when the user presses Escape. ~8 lines of change; benefits BottomSheet, ConfirmDialog, and MoodPickerSheet uniformly.

Updated `useDialogControl` effect (capture latest `onClose` via ref to keep effect deps minimal):
```ts
const onCloseRef = useRef(onClose);
useEffect(() => { onCloseRef.current = onClose; });

useEffect(() => {
  const el = ref.current;
  if (!el) return;
  if (open) el.showModal();
  else el.close();
  const handleCancel = (e: Event) => { e.preventDefault(); onCloseRef.current(); };
  el.addEventListener('cancel', handleCancel);
  return () => el.removeEventListener('cancel', handleCancel);
}, [open]);
```

`e.preventDefault()` keeps the controlled `open` prop in charge of the animation.

### `isDirty` derivation — snapshot diff

```
isDirty = isLoaded && (
  state.mood !== state.snapshot.mood ||
  state.text !== state.snapshot.text ||
  state.textAlign !== state.snapshot.textAlign
)
```
`snapshot` is set by `LOAD_ENTRY` and reset by `MARK_SAVED` (autosave or explicit).

### Autosave save function

`saveFn` (in `Editor.tsx`):
1. Returns early if `state.mood === undefined` (mood is required for a valid `DiaryEntry`).
2. Uses `state.persistedId ?? generateId()` as id.
3. `createdAt = state.persistedCreatedAt ?? new Date().toISOString()`.
4. Calls `upsertDiary({ id, date, mood, text, textAlign, photos: [], createdAt, updatedAt: new Date().toISOString() })`.
5. Dispatches `MARK_SAVED({ id, createdAt })`.

---

## Frontend Design

### Component tree

```
src/app/diary/[date]/page.tsx            (server, unchanged + <Editor />)
src/app/diary/[date]/_components/
  Editor.tsx                             (client container)
  EditorHeader.tsx                       (client)
  EditorBody.tsx                         (client)
  EditorToolbar.tsx                      (client)
  EditorMoreMenu.tsx                     (client)
```

No `UnsavedChangesDialog.tsx` — the two `ConfirmDialog` instances render inline in `Editor.tsx`.

### `page.tsx`

```tsx
import { Editor } from './_components/Editor';
// ...
const { date } = await params;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
return <Editor date={date} />;
```

Outer `<main>` wrapper removed — `Editor` owns its own layout root.

### `Editor.tsx` (container, ~90 lines)

Imports: `useEditorState`, `useAutosave`, `useRouter` (from `next/navigation`), `useToast`, `readDiaries`, `upsertDiary`, `removeDiary`, `generateId`, `Routes`, `MoodPickerSheet`, sub-components, `ConfirmDialog`, `Toast`.

Responsibilities:
- `const [state, dispatch] = useEditorState(date)`.
- `const isDirty = state.isLoaded && (state.mood !== state.snapshot.mood || state.text !== state.snapshot.text || state.textAlign !== state.snapshot.textAlign);`
- `autosaveValue = useMemo(() => ({ mood, text, textAlign }), [state.mood, state.text, state.textAlign])`
- `saveFn = useCallback(...)` depending on `[state.persistedId, state.persistedCreatedAt, date, dispatch]`
- `useAutosave(autosaveValue, 1000, saveFn)`.
- `handleBack`: dirty → `dispatch SET_UNSAVED_DIALOG(true)`; else `router.back()`.
- `handleSaveAndBack`: call `saveFn` then `router.back()`.
- `handleDelete`: `removeDiary(state.persistedId!)` then `router.back()`.
- `handleExplicitSave`: call `saveFn`, then `toast.show('일기를 저장했어요!')`.
- `<MoodPickerSheet open={state.moodSheetMode !== 'closed'} mode={state.moodSheetMode === 'initial' ? 'initial' : 'change'} ...>` with `onCancelInitial={() => router.back()}`.
- Two inline `<ConfirmDialog>` instances for unsaved-changes and delete.
- `<Toast {...toastState}>` rendered above the toolbar in the DOM tree.

### `useEditorState.ts`

`useEditorState(date: string): [EditorState, Dispatch<EditorAction>]`.

State:
```ts
interface EditorState {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  persistedId: string | undefined;
  persistedCreatedAt: string | undefined;
  snapshot: { mood: MoodId | undefined; text: string; textAlign: 'left' | 'center' };
  isLoaded: boolean;
  moodSheetMode: 'initial' | 'change' | 'closed';
  moreMenuOpen: boolean;
  unsavedDialogOpen: boolean;
  deleteDialogOpen: boolean;
}
```

Initial: all empty/false; `moodSheetMode: 'closed'`.

Actions:
```ts
type EditorAction =
  | { type: 'LOAD_ENTRY'; entry: DiaryEntry | undefined }
  | { type: 'SET_MOOD'; mood: MoodId }
  | { type: 'SET_TEXT'; text: string }
  | { type: 'TOGGLE_ALIGN' }
  | { type: 'INSERT_TIME'; nextText: string }
  | { type: 'MARK_SAVED'; id: string; createdAt: string }
  | { type: 'OPEN_MOOD_SHEET' }
  | { type: 'CLOSE_MOOD_SHEET' }
  | { type: 'SET_MORE_MENU'; open: boolean }
  | { type: 'SET_UNSAVED_DIALOG'; open: boolean }
  | { type: 'SET_DELETE_DIALOG'; open: boolean };
```

Reducer key cases:
- `LOAD_ENTRY` with entry: populate fields, snapshot=current, isLoaded=true, moodSheetMode='closed'.
- `LOAD_ENTRY` without entry: snapshot=empty, isLoaded=true, moodSheetMode='initial'.
- `MARK_SAVED`: snapshot=current, persistedId/persistedCreatedAt set.
- `OPEN_MOOD_SHEET`: moodSheetMode='change'.
- `CLOSE_MOOD_SHEET`: moodSheetMode='closed'.

`useEffect` inside the hook: on mount (and date change), `dispatch LOAD_ENTRY(readDiaries().find(e => e.date === date))`.

### `useAutosave.ts`

```ts
function useAutosave<T>(value: T, delayMs: number, saveFn: (v: T) => void): void {
  useEffect(() => {
    const t = setTimeout(() => saveFn(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs, saveFn]);
}
```

Caller wraps `saveFn` in `useCallback`. Caller memoizes `value` if it is an object.

### `EditorHeader.tsx` (~50 lines)

Props: `{ onBack: () => void; onMoreMenu: () => void }`. Two `IconButton`s (back chevron left, ⋯ right) in a flex row.

### `EditorBody.tsx` (~80 lines)

Props:
```ts
{
  date: string;
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  onMoodTap: () => void;
  onTextChange: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}
```

Mood area: `MoodIcon size={72}` inside a tappable button when mood set; placeholder dashed circle + "기분을 선택해요" otherwise. 44px touch target.

Date label: `Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date + 'T00:00:00'))` + static ` ▾`. Inert affordance.

Textarea: `<textarea ref={textareaRef} value={text} onChange={e => onTextChange(e.target.value)} placeholder="오늘 어떤 하루였나요?" maxLength={5000} className="w-full flex-1 resize-none bg-transparent outline-none text-charcoal text-base placeholder:text-meta [textAlign-class]" />`.

### `EditorToolbar.tsx` (~70 lines)

Props:
```ts
{
  isDirty: boolean;
  textAlign: 'left' | 'center';
  onAlignToggle: () => void;
  onTimeInsert: () => void;
  onGalleryTap: () => void;
  onExplicitSave: () => void;
}
```

`sticky bottom-0 bg-paper border-t flex items-center px-4 py-3 pb-[env(safe-area-inset-bottom,0px)] gap-4`.

Icons in order: 🖼 gallery (noop), ☰ align toggle, 🕐 time, then conditional ✓ save (rendered only when `isDirty`).

### `EditorMoreMenu.tsx` (~50 lines)

Props:
```ts
{
  open: boolean;
  hasSavedEntry: boolean;
  onClose: () => void;
  onNavigateList: () => void;
  onDeleteTap: () => void;
}
```

`<BottomSheet open onClose>` body contains:
- Button "📋 일기 리스트 보기" → `onNavigateList`
- Button "🗑 일기 삭제" (only when `hasSavedEntry`) → `onDeleteTap`. Use `text-danger`.

### Time insert flow

In `Editor.tsx`:
1. Holds `textareaRef = useRef<HTMLTextAreaElement>(null)`.
2. `pendingCursorPos = useRef<number | null>(null)`.
3. `handleTimeInsert()`:
   ```ts
   const el = textareaRef.current;
   if (!el) return;
   const start = el.selectionStart;
   const end = el.selectionEnd;
   const now = new Date();
   const hh = String(now.getHours()).padStart(2, '0');
   const mm = String(now.getMinutes()).padStart(2, '0');
   const timeStr = `${hh}:${mm} `;
   const newText = state.text.slice(0, start) + timeStr + state.text.slice(end);
   pendingCursorPos.current = start + timeStr.length;
   dispatch({ type: 'INSERT_TIME', nextText: newText });
   ```
4. `useLayoutEffect` after dispatch:
   ```ts
   useLayoutEffect(() => {
     if (pendingCursorPos.current !== null && textareaRef.current) {
       const p = pendingCursorPos.current;
       textareaRef.current.focus();
       textareaRef.current.setSelectionRange(p, p);
       pendingCursorPos.current = null;
     }
   });
   ```

### `useDialogControl.ts` change

See "Unknown 5" decision above. Add `onCloseRef` capture + `cancel` event listener inside the existing `useEffect`.

---

## Backend Design

None.

---

## Data Model / Migration Design

None. `DiaryEntry.textAlign` already in types. Editor uses `entry.textAlign ?? 'left'` defensively at runtime.

---

## Test Design

### `src/lib/hooks/__tests__/useAutosave.test.ts`

`// @vitest-environment happy-dom`, `vi.useFakeTimers()`.

5 cases:
1. Does not call `saveFn` before `delayMs` elapses.
2. Calls `saveFn` exactly once after `delayMs` elapses.
3. Resets timer on value change.
4. Does not call `saveFn` after unmount.
5. Passes the latest `value` to `saveFn`.

### `src/lib/hooks/__tests__/useEditorState.test.ts`

`// @vitest-environment happy-dom`. Import `@/lib/storage/__tests__/setup`.

5 cases:
1. Initial state: `isLoaded=false`, `moodSheetMode='closed'`, fields empty.
2. After `useEffect` (mount) with empty storage: `LOAD_ENTRY(undefined)` → `moodSheetMode='initial'`.
3. After mount with seeded entry: fields populated, snapshot set, `moodSheetMode='closed'`.
4. `isDirty` derivation: `SET_TEXT` makes dirty; re-set to original makes not dirty.
5. `MARK_SAVED` resets snapshot: dirty → not dirty.

### `src/app/diary/[date]/__tests__/Editor.test.tsx`

`// @vitest-environment happy-dom`. Mocks `next/navigation`, `HTMLDialogElement.prototype.{showModal, close}`. Storage setup imported.

12 cases:
1. New entry: textarea empty, mood sheet auto-opened (mode=initial), delete absent from more menu.
2. Existing entry: textarea filled, mood icon shown, no mood sheet, delete visible in more menu.
3. One-per-day: navigate to date with existing entry shows existing data.
4. Autosave: typing then advancing 1000ms calls `upsertDiary` silently.
5. Autosave guard: `upsertDiary` NOT called when mood undefined.
6. Explicit save tap → `upsertDiary` + toast "일기를 저장했어요!".
7. ✓ icon absent when not dirty.
8. Dirty + back → unsaved dialog opens (not `router.back()`).
9. "저장하고 나가기" → `upsertDiary` + `router.back()`.
10. ⋯ → 일기 삭제 → confirm → `removeDiary(id)` + `router.back()`.
11. MoodIcon tap → mood sheet opens with `mode='change'`, `selectedMoodId={current}`.
12. Time icon tap inserts `HH:MM ` at textarea cursor position.

### `e2e/editor.spec.ts`

One Playwright test. Uses dynamic date (within current month, computed at runtime). Asserts: mood sheet auto-opens on `/diary/[date]`, mood selection closes sheet, typing + 1.5s pause persists to storage, back to `/` shows mood emoji somewhere in calendar grid.

### `e2e/_helpers/seedDiaries.ts`

```ts
export function seedDiariesScript(entries: DiaryEntry[]) {
  const json = JSON.stringify(entries);
  return () => { localStorage.setItem('ddalkkak:diaries:v1', json); };
}
```

Usage: `await page.addInitScript(seedDiariesScript([...]))` before `page.goto(...)`.

---

## Files Expected to Change

### Modified
- `src/app/diary/[date]/page.tsx` — render `<Editor date={date} />`.
- `src/design-system/useDialogControl.ts` — add `cancel` listener via ref pattern.

### New (route-scoped)
- `src/app/diary/[date]/_components/Editor.tsx`
- `src/app/diary/[date]/_components/EditorHeader.tsx`
- `src/app/diary/[date]/_components/EditorBody.tsx`
- `src/app/diary/[date]/_components/EditorToolbar.tsx`
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx`

### New (shared hooks)
- `src/lib/hooks/useAutosave.ts`
- `src/lib/hooks/useEditorState.ts`

### New (tests)
- `src/app/diary/[date]/__tests__/Editor.test.tsx`
- `src/lib/hooks/__tests__/useAutosave.test.ts`
- `src/lib/hooks/__tests__/useEditorState.test.ts`
- `e2e/editor.spec.ts`
- `e2e/_helpers/seedDiaries.ts`

### Not changed
- `src/design-system/ConfirmDialog.tsx` (no `title` prop needed).
- `src/design-system/MoodPickerSheet.tsx` (NB-2 deferred; REQ-009 does not add lines).
- `src/lib/storage/types.ts`, `src/lib/storage/diaries.ts`.

---

## Implementation Order

1. `useDialogControl.ts` — NB-1 fix first.
2. `useAutosave.ts` + tests.
3. `useEditorState.ts` + tests.
4. `EditorHeader.tsx`.
5. `EditorBody.tsx`.
6. `EditorMoreMenu.tsx`.
7. `EditorToolbar.tsx`.
8. `Editor.tsx` (wires all sub-components + inline ConfirmDialogs).
9. `page.tsx` — swap stub for `<Editor />`.
10. `Editor.test.tsx` — integration tests.
11. `seedDiaries.ts` + `editor.spec.ts`.

---

## Backward Compatibility

- `useDialogControl` change is additive (cancel listener calls existing `onClose` callback). Safe.
- `textAlign ?? 'left'` fallback is defensive only; no production data.
- No route path change.

---

## Performance Considerations

- `readDiaries()` runs once on mount inside `useEffect`. Negligible for MVP scale.
- `autosaveValue` memoized via `useMemo` so debounce timer only resets on actual content change.
- `saveFn` wrapped in `useCallback` — re-created only when entry ID/date changes.
- `100dvh` supported in modern mobile browsers (Safari 16+, Chrome 108+).

---

## Infra / Deployment Considerations

None.

---

## Risks and Tradeoffs

1. **Debounce + unmount race** — mitigated by `useAutosave` cleanup `clearTimeout`. Risk: LOW.
2. **`onClose` stability** — addressed via `onCloseRef` capture pattern. Risk: LOW.
3. **`MoodPickerSheet` auto-open timing** — `moodSheetMode` starts `'closed'`, transitions to `'initial'` only after `LOAD_ENTRY`. Dialog always-mounted (REQ-005). Risk: LOW.
4. **`ConfirmDialog` copy without `title`** — sacrifices visual hierarchy. Acceptable for MVP. Future: add `title?` prop.
5. **Toast re-entrancy** — gallery noop and save toast share one `useToast`. Re-entrant calls reset the message; acceptable.
6. **E2E test date dependency** — use dynamic date within current month at test runtime, not hardcoded.

---

## Open Questions

None remaining. All six architecture unknowns closed.

---

## Verdict
PASS

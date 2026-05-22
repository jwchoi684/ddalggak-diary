# API / Interface Contract — REQ-009

## Summary

REQ-009 introduces the diary editor: a single React component tree that handles both new-entry creation and existing-entry editing under the existing route `src/app/diary/[date]/`. This contract covers all new interfaces and the one behavior-change to an existing shared hook (`useDialogControl`). No HTTP endpoints, RPC calls, or backend interfaces are involved. All contracts are client-side TypeScript interfaces, React component prop shapes, and custom hook signatures.

---

## Contract Type

- Internal React component props (new private sub-components)
- Named-export hook signatures (two new hooks, one existing hook modification)
- Storage function usage (existing functions; no new storage API)
- Shared type extensions (none — `DiaryEntry` is unchanged)

---

## 1. `Editor` Component Contract

**Named export from:** `src/app/diary/[date]/_components/Editor.tsx`
**Directive:** `"use client"`

### Props

```ts
interface EditorProps {
  date: string; // ISO "YYYY-MM-DD" — validated upstream in page.tsx
}
```

The component accepts exactly one prop. All other state is internal.

### Behavioral Contract

The component resolves one of four entry contexts on mount by calling `readDiaries().find(e => e.date === date)` inside a `useEffect`:

| Context | Trigger | Initial state | `MoodPickerSheet` | Delete item in ⋯ menu |
|---|---|---|---|---|
| Calendar empty date | No existing entry for `date` | All fields empty | Auto-opens `mode='initial'` | Hidden |
| Calendar existing date | Entry found in storage | Fields prefilled from entry | Not opened | Visible |
| List item tap | Same as above (same route, same param) | Same | Not opened | Visible |
| AI chat citation | Same as above | Same | Not opened | Visible |

**Autosave behavior:** `useAutosave` is wired to `{ mood, text, textAlign }` with `delayMs=1000`. On each timer expiry, `saveFn` is called silently (no toast, no user-visible feedback). `saveFn` is a no-op when `state.mood === undefined`.

**Explicit save behavior:** When the ✓ toolbar icon is tapped, `saveFn` is called synchronously, then `Toast("일기를 저장했어요!")` is shown for ~1800ms, then the textarea is blurred.

**✓ icon visibility:** Rendered only when the textarea is focused AND `isDirty === true`.

**`isDirty` definition:**
```
isDirty = isLoaded && (
  state.mood !== state.snapshot.mood ||
  state.text !== state.snapshot.text ||
  state.textAlign !== state.snapshot.textAlign
)
```
`snapshot` is set by `LOAD_ENTRY` and reset on every successful save (autosave or explicit).

**Back navigation guard:** `handleBack` checks `isDirty`. If `true`, opens the unsaved-changes `ConfirmDialog` instead of calling `router.back()`. If `false`, calls `router.back()` directly.

**Unsaved-changes dialog copy (ConfirmDialog props):**
```
message="저장되지 않은 변경사항이 있어요. 저장하고 나가시겠어요?"
confirmLabel="저장하고 나가기"
cancelLabel="계속 작성"
destructive={false}
```
Confirm action: call `saveFn` then `router.back()`. Cancel action: close dialog, stay on screen.

**Delete dialog copy (ConfirmDialog props):**
```
message="일기를 삭제할까요? 삭제한 일기는 복구할 수 없어요."
confirmLabel="삭제"
cancelLabel="취소"
destructive={true}
```
Confirm action: call `removeDiary(state.persistedId!)` then `router.back()`.

**MoodPickerSheet wiring:**
```tsx
<MoodPickerSheet
  open={state.moodSheetMode !== 'closed'}
  date={date}
  mode={state.moodSheetMode === 'initial' ? 'initial' : 'change'}
  selectedMoodId={state.mood}
  onSelect={(moodId) => dispatch({ type: 'SET_MOOD', mood: moodId })}
  onClose={() => dispatch({ type: 'CLOSE_MOOD_SHEET' })}
  onCancelInitial={() => router.back()}
/>
```

**`saveFn` algorithm (wrapped in `useCallback`):**
1. Guard: if `state.mood === undefined`, return immediately.
2. Determine id: `state.persistedId ?? generateId()`.
3. Determine `createdAt`: `state.persistedCreatedAt ?? new Date().toISOString()`.
4. Call `upsertDiary({ id, date, mood: state.mood, text: state.text, textAlign: state.textAlign, photos: [], createdAt, updatedAt: new Date().toISOString() })`.
5. Dispatch `{ type: 'MARK_SAVED', id, createdAt }`.

`saveFn` dependencies: `[state.persistedId, state.persistedCreatedAt, state.mood, state.text, state.textAlign, date, dispatch]`.

---

## 2. `useAutosave<T>` Hook Contract

**Named export from:** `src/lib/hooks/useAutosave.ts`

### Signature

```ts
export function useAutosave<T>(
  value: T,
  delayMs: number,
  saveFn: (v: T) => void,
): void
```

### Behavior

- On every render where `value`, `delayMs`, or `saveFn` changes (React's `useEffect` dependency comparison), a new `setTimeout(saveFn(value), delayMs)` is scheduled.
- The previous timer is cancelled via the `useEffect` cleanup (`clearTimeout`).
- This produces a 1-shot debounce: `saveFn` fires exactly once after `delayMs` milliseconds of inactivity.
- On component unmount, the cleanup runs and the pending timer is cancelled. `saveFn` will not be called after unmount.
- `saveFn` is called with the `value` captured at the time the effect fires (the value at the time the timeout was created).

### Implementation

```ts
export function useAutosave<T>(value: T, delayMs: number, saveFn: (v: T) => void): void {
  useEffect(() => {
    const t = setTimeout(() => saveFn(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs, saveFn]);
}
```

### Caller Invariants

- **INV-A1:** `saveFn` MUST be wrapped in `useCallback` by the caller. An unstable `saveFn` reference will reset the debounce timer on every render, defeating the debounce.
- **INV-A2:** If `value` is an object, the caller MUST memoize it with `useMemo`. An unstable object reference (new object identity each render even with same contents) will reset the timer on every render.
- **INV-A3:** `delayMs` MUST be a stable number (e.g. a literal or constant). Passing a frequently-changing value defeats the debounce.
- **INV-A4:** `saveFn` MUST be safe to call with a value that was captured when the effect last registered (stale closure hazard). The editor's `saveFn` reads from `state` captured by its `useCallback` deps, not from `value`, so this is satisfied by design.

---

## 3. `useEditorState` Hook Contract

**Named export from:** `src/lib/hooks/useEditorState.ts`

### Signature

```ts
export function useEditorState(date: string): [EditorState, Dispatch<EditorAction>]
```

### Exported Types

```ts
export interface EditorState {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  persistedId: string | undefined;       // DiaryEntry.id from storage; undefined before first save
  persistedCreatedAt: string | undefined; // DiaryEntry.createdAt; undefined before first save
  snapshot: {
    mood: MoodId | undefined;
    text: string;
    textAlign: 'left' | 'center';
  };
  isLoaded: boolean;         // false until LOAD_ENTRY fires; prevents premature dirty-guard
  moodSheetMode: 'initial' | 'change' | 'closed';
  moreMenuOpen: boolean;
  unsavedDialogOpen: boolean;
  deleteDialogOpen: boolean;
}

export type EditorAction =
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

### Initial State (before `LOAD_ENTRY` fires)

```ts
{
  mood: undefined,
  text: '',
  textAlign: 'left',
  persistedId: undefined,
  persistedCreatedAt: undefined,
  snapshot: { mood: undefined, text: '', textAlign: 'left' },
  isLoaded: false,
  moodSheetMode: 'closed',
  moreMenuOpen: false,
  unsavedDialogOpen: false,
  deleteDialogOpen: false,
}
```

### Action Descriptions

| Action | Mutations |
|---|---|
| `LOAD_ENTRY` with `entry: DiaryEntry` | Sets `mood`, `text`, `textAlign = entry.textAlign ?? 'left'`, `persistedId`, `persistedCreatedAt`, `snapshot = { mood, text, textAlign }`, `isLoaded = true`, `moodSheetMode = 'closed'` |
| `LOAD_ENTRY` with `entry: undefined` | Sets all fields to empty defaults, `snapshot = { mood: undefined, text: '', textAlign: 'left' }`, `isLoaded = true`, `moodSheetMode = 'initial'` |
| `SET_MOOD` | Sets `mood`. Does not modify `snapshot` (dirty-check will catch the diff). |
| `SET_TEXT` | Sets `text`. Does not modify `snapshot`. |
| `TOGGLE_ALIGN` | Toggles `textAlign` between `'left'` and `'center'`. |
| `INSERT_TIME` | Replaces `text` with `nextText` (pre-spliced by caller). Caller is responsible for computing the new string. |
| `MARK_SAVED` | Sets `persistedId = id`, `persistedCreatedAt = createdAt`, resets `snapshot = { mood, text, textAlign }` (current values). After this action `isDirty` becomes `false`. |
| `OPEN_MOOD_SHEET` | Sets `moodSheetMode = 'change'`. |
| `CLOSE_MOOD_SHEET` | Sets `moodSheetMode = 'closed'`. |
| `SET_MORE_MENU` | Sets `moreMenuOpen = open`. |
| `SET_UNSAVED_DIALOG` | Sets `unsavedDialogOpen = open`. |
| `SET_DELETE_DIALOG` | Sets `deleteDialogOpen = open`. |

### Internal `useEffect`

On mount and on `date` change:
```ts
useEffect(() => {
  const entry = readDiaries().find(e => e.date === date);
  dispatch({ type: 'LOAD_ENTRY', entry });
}, [date]);
```

This follows the established `isReady` hydration-guard pattern from `useDiaries`.

---

## 4. `useDialogControl` Behavior Change

**Existing export from:** `src/design-system/useDialogControl.ts`
**Signature:** UNCHANGED — `useDialogControl(open: boolean, onClose: () => void): DialogControlResult`
**Interface:** UNCHANGED — `DialogControlResult { ref, onDialogClick }`

### What changes

The existing `useEffect` that calls `showModal()` / `close()` is extended to also attach a `cancel` event listener. When the user presses Escape, the native `<dialog>` fires a `cancel` event before closing itself. The listener calls `e.preventDefault()` (to block the browser's automatic close, keeping the controlled `open` prop in charge of animation) and then calls `onClose()`.

```ts
// Pattern used — captures latest onClose via ref to keep effect deps stable:
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

### Effect on existing consumers

All three existing consumers (`BottomSheet`, `ConfirmDialog`, `MoodPickerSheet`) inherit the Escape-closes behavior automatically:

- `BottomSheet.onClose` will now correctly fire on Escape. `MoodPickerSheet` wraps `BottomSheet` and passes `handleCancel` as `onClose`; `handleCancel` calls `onCancelInitial?.()` before `onClose()`. This resolves carry-forward NB-1: pressing Escape on the new-entry mood sheet will now trigger `onCancelInitial`, which calls `router.back()`.
- `ConfirmDialog.onCancel` will now correctly fire on Escape (equivalent to tapping the cancel button).
- No caller changes are required. The change is purely additive at the behavior layer.

---

## 5. Sub-Component Props Contracts

These are route-private components under `src/app/diary/[date]/_components/`. They are not exported beyond the editor tree.

### `EditorHeader`

```ts
interface EditorHeaderProps {
  onBack: () => void;    // Caller checks isDirty before calling router.back() or opening dialog
  onMoreMenu: () => void; // Opens EditorMoreMenu (BottomSheet)
}
```

Renders two `IconButton` instances (44×44, white circular): back-chevron on the left, ⋯ on the right, in a flex row.

### `EditorBody`

```ts
interface EditorBodyProps {
  date: string;                                    // ISO "YYYY-MM-DD"
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  onMoodTap: () => void;                           // Dispatches OPEN_MOOD_SHEET
  onTextChange: (text: string) => void;            // Dispatches SET_TEXT
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}
```

Mood area: When `mood` is defined, renders `<MoodIcon id={mood} size={72} />` inside a tappable button (44px touch target minimum). When `mood` is `undefined`, renders a placeholder dashed circle with label `"기분을 선택해요"`.

Date label: Korean long format via `Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })` applied to `new Date(date + 'T00:00:00')`, followed by the static string ` ▾`. The ▾ is inert for this REQ (REQ-010 hooks in here).

Textarea: `<textarea ref={textareaRef} value={text} onChange={e => onTextChange(e.target.value)} placeholder="오늘 어떤 하루였나요?" maxLength={5000} />` with CSS classes for alignment toggle (`text-left` or `text-center`), `resize-none`, `bg-transparent`, `outline-none`.

### `EditorToolbar`

```ts
interface EditorToolbarProps {
  isDirty: boolean;           // Controls conditional ✓ save icon visibility
  textAlign: 'left' | 'center';
  onAlignToggle: () => void;  // Dispatches TOGGLE_ALIGN
  onTimeInsert: () => void;   // Computes HH:MM string and dispatches INSERT_TIME
  onGalleryTap: () => void;   // Noop for this REQ; fires Toast("곧 만나요!"); REQ-011 replaces
  onExplicitSave: () => void; // Calls saveFn then shows save toast
}
```

Icon order (left to right): 🖼 gallery, ☰ align toggle, 🕐 time insert, then ✓ save (conditional — renders only when `isDirty === true`).

CSS: `sticky bottom-0 bg-paper border-t flex items-center px-4 py-3 gap-4` with `pb-[env(safe-area-inset-bottom,0px)]` for iPhone notch.

### `EditorMoreMenu`

```ts
interface EditorMoreMenuProps {
  open: boolean;
  hasSavedEntry: boolean;   // When false, "🗑 일기 삭제" item is hidden
  onClose: () => void;
  onNavigateList: () => void; // Navigates to Routes.list
  onDeleteTap: () => void;    // Opens delete ConfirmDialog (does not delete directly)
}
```

Wraps `<BottomSheet open={open} onClose={onClose}>`. Contains two buttons:
- `"📋 일기 리스트 보기"` — always visible, calls `onNavigateList`.
- `"🗑 일기 삭제"` — rendered only when `hasSavedEntry === true`, uses `text-danger` color, calls `onDeleteTap`.

---

## 6. Storage API Usage

The editor uses the following functions from `@/lib/storage` without modification:

```ts
function readDiaries(): DiaryEntry[]
function upsertDiary(entry: DiaryEntry): void
function removeDiary(id: string): void
function generateId(): string
```

### `DiaryEntry` fields written by REQ-009

All 8 fields are always written on every `upsertDiary` call:

| Field | Value |
|---|---|
| `id` | `state.persistedId ?? generateId()` — stable across autosave cycles after first save |
| `date` | Route param; ISO "YYYY-MM-DD" |
| `mood` | Current mood selection; never `undefined` at call time (guard enforced) |
| `text` | Current textarea value (may be empty string) |
| `textAlign` | Current alignment state; `'left'` or `'center'` |
| `photos` | Always `[]` for this REQ (REQ-011 adds photo support) |
| `createdAt` | `state.persistedCreatedAt ?? new Date().toISOString()` — preserved across edits |
| `updatedAt` | `new Date().toISOString()` — always refreshed on every save call |

**Key naming note:** The body field in `DiaryEntry` is `text` (not `body`). All internal editor state and action references use `text` to match the storage type.

**`removeDiary` key note:** `removeDiary` is keyed on `DiaryEntry.id`, not on `date`. The editor must retain `state.persistedId` from the initial `LOAD_ENTRY` action to pass the correct id to delete. Delete is only reachable via the ⋯ menu when `hasSavedEntry === true` (i.e., a real persisted id is known).

---

## 7. Caller Invariants (Consolidated)

1. **`Editor` receives a valid ISO `YYYY-MM-DD` date string.** The regex `^\d{4}-\d{2}-\d{2}$` is enforced in the server component `page.tsx` before `<Editor date={date} />` is rendered. `Editor` must not re-validate — it trusts the prop.

2. **`useAutosave`'s `saveFn` must be wrapped in `useCallback`.** An unstable function reference re-schedules the debounce timer on every render, breaking the 1-second inactivity guarantee.

3. **`useAutosave`'s `value` must be memoized with `useMemo` if it is an object.** In the editor: `const autosaveValue = useMemo(() => ({ mood: state.mood, text: state.text, textAlign: state.textAlign }), [state.mood, state.text, state.textAlign])`.

4. **Autosave fires at most once per 1 second of inactivity.** The 1000ms `delayMs` is a project constant; implementers must not pass a shorter value without updating this contract.

5. **Autosave is always silent.** No `Toast`, no `console.log`, no UI state change beyond `MARK_SAVED`. Any toast on autosave is a bug.

6. **Explicit save (✓ icon) always shows `Toast("일기를 저장했어요!")`.** The toast is the sole user-visible signal that an explicit save occurred.

7. **Empty-body save is allowed when mood is set.** `state.text === ''` is a valid `DiaryEntry`. The guard in `saveFn` checks only `state.mood === undefined`.

8. **Save with `mood === undefined` is a no-op.** `saveFn` returns immediately without calling `upsertDiary`, dispatching `MARK_SAVED`, or showing any toast.

9. **`removeDiary(id)` requires a persisted id.** The delete button is only visible when `hasSavedEntry === true`, which is only true when `state.persistedId !== undefined`. The caller must never call `removeDiary(undefined!)`.

10. **`MoodPickerSheet` `onCancelInitial` in new-entry context must call `router.back()`.** When the user presses Escape or taps the close button on the initial mood picker without selecting a mood, the correct behavior is to leave the editor entirely. Staying on the editor with no mood and no back-navigation path would strand the user.

11. **`useEditorState`'s `LOAD_ENTRY` action is dispatched exactly once per mount** (and once more if `date` changes, which cannot happen without a navigation). Dispatching `LOAD_ENTRY` more than once resets `snapshot`, which would incorrectly mark the user's unsaved changes as clean.

12. **`isDirty` is `false` while `isLoaded === false`.** This prevents the unsaved-changes guard from firing during the one-frame window between mount and the storage `useEffect` completing.

13. **`DiaryEntry.textAlign` is read with a `?? 'left'` fallback at runtime**, even though the TypeScript type marks it required, to handle any legacy localStorage data that predates the field.

14. **`moodSheetMode` transitions are one-directional per interaction:** `'closed' → 'initial'` (set only by `LOAD_ENTRY` with no entry), `'closed' ↔ 'change'` (user taps mood icon or closes sheet). Once `LOAD_ENTRY` fires for an existing entry, `moodSheetMode` stays `'closed'` until the user explicitly taps the mood area.

---

## 8. Error Handling

No HTTP calls; no async operations other than `localStorage` reads/writes.

| Error condition | Handling |
|---|---|
| `upsertDiary` throws `DOMException (QuotaExceededError)` | Not caught by the editor for MVP. Error propagates to React error boundary (if present) or unhandled. Future REQ may add a toast. |
| `removeDiary` called with `undefined` id | Blocked by invariant INV-9 (delete button only visible when `persistedId` is defined). |
| `readDiaries()` returns corrupt data | `readDiaries` already returns `[]` on corrupt JSON; the editor treats this as no existing entry and enters new-entry context. |
| `date` param fails regex | `notFound()` is called in `page.tsx` before `Editor` is rendered; `Editor` never sees an invalid date. |

---

## 9. Auth / Permission Rules

None. This is a local-only, single-user app with no authentication layer. `localStorage` access is unrestricted within the browser session.

---

## 10. Backward Compatibility

- **No existing named exports are renamed or removed.** `readDiaries`, `upsertDiary`, `removeDiary`, `generateId`, `DiaryEntry`, `MoodId`, `useDialogControl`, `BottomSheet`, `ConfirmDialog`, `MoodPickerSheet`, `Routes` — all signatures unchanged.
- **`useDialogControl` cancel-listener is additive.** The hook now calls `onClose` on native Escape in addition to backdrop click. Existing callers (`BottomSheet`, `ConfirmDialog`, `MoodPickerSheet`) already expose `onClose`/`onCancel` for this purpose; the behavior they expected ("Escape closes the dialog") now works correctly rather than silently not working.
- **`ConfirmDialog` is not modified.** No `title` prop is added. Dialog copy uses the `message` field as a single combined string per technical design decision.
- **`MoodPickerSheet` is not modified.** NB-2 (extract `MoodPickerTabs`) is deferred.
- **Page route `src/app/diary/[date]/` is unchanged.** URL structure, param name (`date`), and Next.js async-params pattern are all preserved.
- **`DiaryEntry` type is unchanged.** `textAlign` is already a required field. No schema migration needed.

---

## 11. Examples

### `Editor` usage (in `page.tsx`)

```tsx
// src/app/diary/[date]/page.tsx
import { notFound } from 'next/navigation';
import { Editor } from './_components/Editor';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DiaryPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return <Editor date={date} />;
}
```

### `useAutosave` usage (in `Editor.tsx`)

```tsx
const autosaveValue = useMemo(
  () => ({ mood: state.mood, text: state.text, textAlign: state.textAlign }),
  [state.mood, state.text, state.textAlign],
);

const saveFn = useCallback(
  (v: typeof autosaveValue) => {
    if (!v.mood) return;
    const id = state.persistedId ?? generateId();
    const createdAt = state.persistedCreatedAt ?? new Date().toISOString();
    upsertDiary({ id, date, mood: v.mood, text: v.text, textAlign: v.textAlign,
                  photos: [], createdAt, updatedAt: new Date().toISOString() });
    dispatch({ type: 'MARK_SAVED', id, createdAt });
  },
  [state.persistedId, state.persistedCreatedAt, date, dispatch],
);

useAutosave(autosaveValue, 1000, saveFn);
```

### `useEditorState` usage (in `Editor.tsx`)

```tsx
const [state, dispatch] = useEditorState(date);

const isDirty = state.isLoaded && (
  state.mood !== state.snapshot.mood ||
  state.text !== state.snapshot.text ||
  state.textAlign !== state.snapshot.textAlign
);

dispatch({ type: 'SET_TEXT', text: e.target.value });
dispatch({ type: 'TOGGLE_ALIGN' });
dispatch({ type: 'SET_MORE_MENU', open: true });
dispatch({ type: 'MARK_SAVED', id: '...', createdAt: '2026-05-19T10:00:00.000Z' });
```

### Time-insert sequence (in `Editor.tsx`)

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);
const pendingCursorPos = useRef<number | null>(null);

function handleTimeInsert() {
  const el = textareaRef.current;
  if (!el) return;
  const { selectionStart: start, selectionEnd: end } = el;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} `;
  const nextText = state.text.slice(0, start) + timeStr + state.text.slice(end);
  pendingCursorPos.current = start + timeStr.length;
  dispatch({ type: 'INSERT_TIME', nextText });
}

useLayoutEffect(() => {
  if (pendingCursorPos.current !== null && textareaRef.current) {
    const p = pendingCursorPos.current;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(p, p);
    pendingCursorPos.current = null;
  }
});
```

### `useDialogControl` after change — existing consumer unchanged

```tsx
// BottomSheet.tsx — no caller changes required
const { ref, onDialogClick } = useDialogControl(open, onClose);
// Escape now fires onClose automatically via the cancel listener in useDialogControl
```

---

## Implementation Notes for Backend

None. REQ-009 is purely client-side. All persistence is `localStorage`.

---

## Implementation Notes for Frontend

1. **File locations matter.** All route-scoped components live under `src/app/diary/[date]/_components/` (note: no `(routes)` route group — the actual path confirmed by architecture report is `src/app/diary/[date]/`, not `src/app/(routes)/diary/[date]/`).

2. **Shared hooks location.** `useAutosave.ts` and `useEditorState.ts` go in `src/lib/hooks/`. This directory may need to be created.

3. **`useDialogControl.ts` must be patched first** (implementation step 1) before any component that relies on Escape-key behavior can be correctly tested.

4. **`isLoaded` gates the dirty-check and back-guard.** Do not skip this flag. The one render-frame between mount and `LOAD_ENTRY` dispatch would otherwise trigger the guard spuriously.

5. **`MoodPickerSheet` starts in `moodSheetMode: 'closed'` regardless of context.** It transitions to `'initial'` only inside the `LOAD_ENTRY` reducer case (not in initial React state), so `showModal()` is never called before the dialog ref is attached.

6. **`100dvh` layout.** `<main className="flex flex-col h-[100dvh] bg-cream">` with `<EditorBody className="flex-1 overflow-y-auto">` and `<EditorToolbar className="sticky bottom-0 ...">`. This is CSS-only; no `visualViewport` listener needed.

7. **`env(safe-area-inset-bottom, 0px)` fallback.** Always include the fallback value (`0px`) for browsers that do not support the CSS env variable.

8. **Gallery icon in `EditorToolbar`.** Renders as a tappable icon that calls `onGalleryTap`, which dispatches a `Toast("곧 만나요!")` noop. This matches the inactive-tab pattern used in REQ-008 `MoodPickerTabs`.

9. **Test environment setup.** All editor component tests require `// @vitest-environment happy-dom`, `HTMLDialogElement.prototype.showModal = vi.fn()`, and `vi.useFakeTimers()`. Import `@/lib/storage/__tests__/setup` for the `LocalStorageShim`. Use helpers from `@/lib/navigation/__tests__/setupNextNavigation.ts` for `useRouter` mocking.

10. **E2E seeding.** Use `await page.addInitScript(fn)` before `await page.goto(url)` to seed localStorage for the "existing entry" contexts. Define the seed helper in `e2e/_helpers/seedDiaries.ts`.

---

## Verdict
PASS

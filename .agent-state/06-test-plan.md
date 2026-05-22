# Test Plan — REQ-009 (일기 에디터)

## Summary

REQ-009 introduces the diary editor: a single-screen component that covers both new-entry and existing-entry flows. The test surface comprises four areas:

1. `useAutosave` hook — 5 unit cases (debounce timing and cleanup correctness)
2. `useEditorState` hook — 5 unit cases (reducer actions, dirty flag, initial state)
3. `Editor` component integration — 12 cases (four entry contexts, autosave, explicit save, back-navigation guard, delete flow, mood tap, time-insert)
4. `useDialogControl` Escape fix — 2 new cases added to the existing test file (cancel event fires `onClose`)
5. E2E — 1 Playwright test (full user journey: empty cell → mood → body → autosave → back → calendar shows mood)

All unit/integration tests use Vitest 2.x + `@testing-library/react` 16.x + happy-dom. The E2E test uses Playwright 1.44 against `http://localhost:3000`.

---

## Fixtures / Mocks Needed

### `makeDiary` (already exists)

`/Users/jay/Documents/Projects/ai_diary/src/lib/storage/__tests__/fixtures.ts` exports `makeDiary(overrides?)`. Use it wherever a pre-existing `DiaryEntry` is needed. Key override: `{ date: '2026-05-15', mood: 'joy', text: 'hello' }`.

### Storage mock pattern (for hook tests)

```ts
vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    readDiaries:  vi.fn(() => []),
    upsertDiary:  vi.fn(),
    removeDiary:  vi.fn(),
  };
});

const { readDiaries, upsertDiary, removeDiary } = await import('@/lib/storage');
const readDiariesMock  = readDiaries  as ReturnType<typeof vi.fn>;
const upsertDiaryMock  = upsertDiary  as ReturnType<typeof vi.fn>;
const removeDiaryMock  = removeDiary  as ReturnType<typeof vi.fn>;
```

Dynamic `await import(...)` must come **after** `vi.mock(...)` calls (established pattern from `useDiaries.test.ts`).

### `next/navigation` mock pattern (for component tests)

```ts
import {
  mockRouter,
  mockUseRouter,
  mockUseSearchParams,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));
```

### `HTMLDialogElement` prototype mock (for component tests)

```ts
let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;

beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  cleanup();
});
```

### E2E seed helper

New file: `e2e/_helpers/seedDiaries.ts`

```ts
import type { DiaryEntry } from '@/lib/storage/types';

export function seedDiariesScript(entries: DiaryEntry[]) {
  const json = JSON.stringify(entries);
  return () => {
    localStorage.setItem('ddalkkak:diaries:v1', json);
  };
}
```

Usage in Playwright tests: `await page.addInitScript(seedDiariesScript([entry]))` before `page.goto(url)`.

---

## Unit Tests

### File 1 — `src/lib/hooks/__tests__/useAutosave.test.ts`

**Environment directive:** `// @vitest-environment happy-dom`

**Imports:**
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAutosave } from '@/lib/hooks/useAutosave';
```

**beforeEach / afterEach:**
```ts
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); cleanup(); });
```

No `LocalStorageShim` needed (no storage access in this hook).

---

#### Case A1 — saveFn not called before delayMs

Description: `saveFn` is NOT called before 1000 ms has elapsed.

```ts
it('does not call saveFn before delayMs elapses', () => {
  const saveFn = vi.fn();
  renderHook(() => useAutosave('hello', 1000, saveFn));
  act(() => { vi.advanceTimersByTime(999); });
  expect(saveFn).not.toHaveBeenCalled();
});
```

Key assertion: `expect(saveFn).not.toHaveBeenCalled()` after 999 ms.

---

#### Case A2 — saveFn called exactly once after delayMs

Description: `saveFn` is called exactly once when timer elapses.

```ts
it('calls saveFn exactly once after delayMs elapses', () => {
  const saveFn = vi.fn();
  renderHook(() => useAutosave('hello', 1000, saveFn));
  act(() => { vi.advanceTimersByTime(1000); });
  expect(saveFn).toHaveBeenCalledTimes(1);
});
```

Key assertion: `toHaveBeenCalledTimes(1)`.

---

#### Case A3 — timer resets on value change

Description: If the hook re-renders with a new `value` before 1000 ms, the timer resets. Total silence window must be 1000 ms from the latest value change.

```ts
it('resets timer on value change before delayMs', () => {
  const saveFn = vi.fn();
  const { rerender } = renderHook(
    ({ value }) => useAutosave(value, 1000, saveFn),
    { initialProps: { value: 'a' } },
  );
  act(() => { vi.advanceTimersByTime(800); });
  act(() => { rerender({ value: 'ab' }); });
  act(() => { vi.advanceTimersByTime(800); }); // 800ms since rerender, not 1600ms total
  expect(saveFn).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(200); }); // now 1000ms since last change
  expect(saveFn).toHaveBeenCalledTimes(1);
});
```

Key assertion: `not.toHaveBeenCalled()` at 800 ms after rerender; `toHaveBeenCalledTimes(1)` at 1000 ms.

---

#### Case A4 — saveFn not called after unmount

Description: Unmounting the hook cancels the pending timer. `saveFn` is never called.

```ts
it('does not call saveFn after unmount', () => {
  const saveFn = vi.fn();
  const { unmount } = renderHook(() => useAutosave('hello', 1000, saveFn));
  act(() => { vi.advanceTimersByTime(500); });
  unmount();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(saveFn).not.toHaveBeenCalled();
});
```

Key assertion: `not.toHaveBeenCalled()` after unmount + timer advance.

---

#### Case A5 — saveFn receives the latest value

Description: When the hook fires, `saveFn` is called with the `value` captured at effect-registration time (the value that triggered the last timer reset).

```ts
it('passes the latest value to saveFn', () => {
  const saveFn = vi.fn();
  const { rerender } = renderHook(
    ({ value }) => useAutosave(value, 1000, saveFn),
    { initialProps: { value: 'first' } },
  );
  act(() => { rerender({ value: 'second' }); });
  act(() => { vi.advanceTimersByTime(1000); });
  expect(saveFn).toHaveBeenCalledWith('second');
});
```

Key assertion: `toHaveBeenCalledWith('second')` — not `'first'`.

---

### File 2 — `src/lib/hooks/__tests__/useEditorState.test.ts`

**Environment directive:** `// @vitest-environment happy-dom`

**Imports:**
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
```

Storage mock setup (same pattern as `useDiaries.test.ts`):
```ts
vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return { ...original, readDiaries: vi.fn(() => []) };
});

const { readDiaries } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const { useEditorState } = await import('@/lib/hooks/useEditorState');
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');
```

Also import `@/lib/storage/__tests__/setup` to install the `LocalStorageShim` (even though storage is mocked, the import guard pattern in `useEditorState` may inspect `typeof window`).

**beforeEach / afterEach:**
```ts
beforeEach(() => { readDiariesMock.mockReturnValue([]); });
afterEach(() => { cleanup(); });
```

---

#### Case B1 — initial state before LOAD_ENTRY fires

Description: Immediately after `renderHook`, before effects flush, state is the correct empty initial.

```ts
it('initial state has correct empty shape', () => {
  const { result } = renderHook(() => useEditorState('2026-05-15'));
  // Check synchronous initial state (before useEffect fires)
  expect(result.current[0].text).toBe('');
  expect(result.current[0].mood).toBeUndefined();
  expect(result.current[0].textAlign).toBe('left');
  expect(result.current[0].persistedId).toBeUndefined();
  expect(result.current[0].moreMenuOpen).toBe(false);
  expect(result.current[0].unsavedDialogOpen).toBe(false);
  expect(result.current[0].deleteDialogOpen).toBe(false);
});
```

Key assertion: all UI dialog open states are `false`; text/mood are empty; no persisted id.

---

#### Case B2 — LOAD_ENTRY with no existing entry → moodSheetMode='initial'

Description: When `readDiaries` returns nothing for the given date, after effects flush the reducer dispatches `LOAD_ENTRY(undefined)`, setting `moodSheetMode='initial'` and `isLoaded=true`.

```ts
it('empty storage → isLoaded=true, moodSheetMode="initial"', async () => {
  readDiariesMock.mockReturnValue([]);
  const { result } = renderHook(() => useEditorState('2026-05-15'));
  await act(async () => {});
  expect(result.current[0].isLoaded).toBe(true);
  expect(result.current[0].moodSheetMode).toBe('initial');
  expect(result.current[0].mood).toBeUndefined();
  expect(result.current[0].text).toBe('');
});
```

Key assertion: `moodSheetMode === 'initial'` and `isLoaded === true`.

---

#### Case B3 — LOAD_ENTRY with existing entry → fields populated, moodSheetMode='closed'

Description: When `readDiaries` returns an entry matching the date, state is populated from that entry and no mood sheet opens.

```ts
it('existing entry → fields prefilled, moodSheetMode="closed"', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'sad', text: 'yesterday' });
  readDiariesMock.mockReturnValue([entry]);
  const { result } = renderHook(() => useEditorState('2026-05-15'));
  await act(async () => {});
  const [state] = result.current;
  expect(state.isLoaded).toBe(true);
  expect(state.mood).toBe('sad');
  expect(state.text).toBe('yesterday');
  expect(state.textAlign).toBe(entry.textAlign);
  expect(state.persistedId).toBe(entry.id);
  expect(state.persistedCreatedAt).toBe(entry.createdAt);
  expect(state.moodSheetMode).toBe('closed');
  // snapshot must equal loaded values (not dirty yet)
  expect(state.snapshot).toEqual({ mood: 'sad', text: 'yesterday', textAlign: entry.textAlign });
});
```

Key assertions: all fields match the fixture; `snapshot` equals loaded data; `moodSheetMode === 'closed'`.

---

#### Case B4 — isDirty derivation: SET_TEXT makes dirty; reverting makes not dirty

Description: `isDirty` is computed as `isLoaded && (state !== snapshot)`. After `SET_TEXT` with a new value, `isDirty` is `true`. After `SET_TEXT` back to the original value, `isDirty` is `false`.

```ts
it('SET_TEXT makes isDirty=true; reverting to original makes isDirty=false', async () => {
  const entry = makeDiary({ date: '2026-05-15', text: 'original' });
  readDiariesMock.mockReturnValue([entry]);
  const { result } = renderHook(() => useEditorState('2026-05-15'));
  await act(async () => {});
  const [stateAfterLoad, dispatch] = result.current;

  // Derive isDirty from state (mirrors Editor.tsx logic):
  const isDirty = (s: typeof stateAfterLoad) =>
    s.isLoaded && (
      s.mood !== s.snapshot.mood ||
      s.text !== s.snapshot.text ||
      s.textAlign !== s.snapshot.textAlign
    );

  expect(isDirty(stateAfterLoad)).toBe(false);

  act(() => { dispatch({ type: 'SET_TEXT', text: 'changed' }); });
  expect(isDirty(result.current[0])).toBe(true);

  act(() => { dispatch({ type: 'SET_TEXT', text: 'original' }); });
  expect(isDirty(result.current[0])).toBe(false);
});
```

Key assertions: `isDirty` is derived with snapshot comparison; reverts correctly.

---

#### Case B5 — MARK_SAVED resets snapshot so isDirty becomes false

Description: After setting text (dirty), dispatching `MARK_SAVED` resets the snapshot to the current state, making `isDirty` `false`.

```ts
it('MARK_SAVED resets snapshot → isDirty=false after save', async () => {
  const entry = makeDiary({ date: '2026-05-15', text: 'original' });
  readDiariesMock.mockReturnValue([entry]);
  const { result } = renderHook(() => useEditorState('2026-05-15'));
  await act(async () => {});
  const [, dispatch] = result.current;

  act(() => { dispatch({ type: 'SET_TEXT', text: 'changed' }); });

  const isDirty = (s: typeof result.current[0]) =>
    s.isLoaded && (
      s.mood !== s.snapshot.mood ||
      s.text !== s.snapshot.text ||
      s.textAlign !== s.snapshot.textAlign
    );

  expect(isDirty(result.current[0])).toBe(true);

  act(() => {
    dispatch({ type: 'MARK_SAVED', id: entry.id, createdAt: entry.createdAt });
  });
  expect(isDirty(result.current[0])).toBe(false);
  expect(result.current[0].snapshot.text).toBe('changed');
});
```

Key assertions: `isDirty` becomes `false`; `snapshot.text` is updated to `'changed'`.

---

## Integration Tests

### File 3 — `src/app/diary/[date]/__tests__/Editor.test.tsx`

**Environment directive:** `// @vitest-environment happy-dom`

**Imports:**
```ts
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  mockRouter, mockUseRouter, mockUseSearchParams,
  mockUseParams, mockUsePathname, resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';
```

**Top-level mock setup (before any dynamic imports):**

```ts
vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    readDiaries: vi.fn(() => []),
    upsertDiary: vi.fn(),
    removeDiary: vi.fn(),
  };
});

const { readDiaries, upsertDiary, removeDiary } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const upsertDiaryMock = upsertDiary as ReturnType<typeof vi.fn>;
const removeDiaryMock = removeDiary as ReturnType<typeof vi.fn>;
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');
const { Editor } = await import('@/app/diary/[date]/_components/Editor');
```

**beforeEach / afterEach:**
```ts
let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;

beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
  vi.useFakeTimers();
  vi.clearAllMocks();
  resetNavigationMocks();
  readDiariesMock.mockReturnValue([]);
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  vi.useRealTimers();
  cleanup();
});
```

**Shared render helper:**
```ts
async function renderEditor(date = '2026-05-15') {
  render(<Editor date={date} />);
  await act(async () => {}); // flush useEffect (LOAD_ENTRY)
}
```

**Button query helper** (matches existing pattern from `MoodPickerSheet.test.tsx`):
```ts
function btn(labelOrText: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.getAttribute('aria-label') === labelOrText || b.textContent?.trim() === labelOrText,
  );
  if (!found) throw new Error(`Button not found: ${labelOrText}`);
  return found;
}
```

---

#### Case C1 — New entry: empty textarea, mood sheet auto-opened, delete hidden

Description: When `readDiaries` returns nothing for the date, the editor renders with an empty textarea, the `MoodPickerSheet` is opened (`showModal` called), and the delete item is not present in the DOM.

```ts
it('new entry: empty textarea, showModal called, delete button absent', async () => {
  readDiariesMock.mockReturnValue([]);
  await renderEditor();

  const textarea = document.querySelector('textarea');
  expect(textarea?.value).toBe('');
  // showModal called = mood sheet is open
  expect(showModalMock).toHaveBeenCalled();
  // Delete item must not appear in any button
  const allText = Array.from(document.querySelectorAll('button'))
    .map((b) => b.textContent ?? '').join('');
  expect(allText).not.toContain('일기 삭제');
});
```

Key assertions: `textarea.value === ''`; `showModalMock` called; no delete button text.

---

#### Case C2 — Existing entry: textarea filled, mood icon shown, delete visible in more menu

Description: When storage returns a matching entry, the editor prefills the textarea; after opening the more menu, the delete item is visible.

```ts
it('existing entry: textarea filled, delete visible in more menu', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '행복한 하루' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  expect(textarea.value).toBe('행복한 하루');

  // Open more menu
  fireEvent.click(btn('더보기'));
  // Delete item must be present
  expect(document.body.textContent).toContain('일기 삭제');
});
```

Key assertions: `textarea.value` matches fixture `text`; delete item appears after more-menu tap.

Note: The more-menu `IconButton` `aria-label` must be `"더보기"` — implementer must set it accordingly.

---

#### Case C3 — 1-per-day: navigating to a date with an existing entry shows existing data

Description: Even if navigated as a "new entry" route, if storage has a record for that date, the editor shows the existing data.

```ts
it('1-per-day: existing entry for date shown even if navigated as new', async () => {
  const entry = makeDiary({ date: '2026-05-20', mood: 'calm', text: '조용한 날' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor('2026-05-20');

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  expect(textarea.value).toBe('조용한 날');
});
```

Key assertion: `textarea.value` is the fetched entry's text, not empty.

---

#### Case C4 — Autosave: typing then advancing 1000 ms calls upsertDiary silently

Description: After the editor loads for an existing entry (mood set), typing in the textarea and advancing 1000 ms triggers `upsertDiary`. No toast is shown.

```ts
it('autosave: typing + 1000ms → upsertDiary called, no toast', async () => {
  // Seed an entry with mood so saveFn guard passes
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '새 내용' } });

  act(() => { vi.advanceTimersByTime(1000); });

  expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
  expect(upsertDiaryMock).toHaveBeenCalledWith(
    expect.objectContaining({ text: '새 내용', date: '2026-05-15' }),
  );
  // No toast (toast text absent)
  expect(document.body.textContent).not.toContain('일기를 저장했어요!');
});
```

Key assertions: `upsertDiary` called once with matching text; toast text absent.

---

#### Case C5 — Autosave guard: upsertDiary NOT called when mood is undefined

Description: For a new entry with no mood selected (mood = undefined), `saveFn` returns early without calling `upsertDiary`, even after 1000 ms.

```ts
it('autosave guard: upsertDiary not called when mood is undefined', async () => {
  readDiariesMock.mockReturnValue([]); // new entry, mood=undefined
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '내용 있음' } });

  act(() => { vi.advanceTimersByTime(1000); });

  expect(upsertDiaryMock).not.toHaveBeenCalled();
});
```

Key assertion: `upsertDiary` not called despite text change.

---

#### Case C6 — Explicit save: ✓ icon tap calls upsertDiary and shows toast

Description: When the editor is dirty, the ✓ save icon is visible. Tapping it calls `upsertDiary` and shows `"일기를 저장했어요!"` toast.

```ts
it('explicit save: ✓ tap → upsertDiary called + save toast shown', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '수정됨' } });
  // Focus the textarea to make ✓ icon visible (isDirty must be true)
  fireEvent.focus(textarea);

  // Find and click the save button
  fireEvent.click(btn('저장'));

  expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
  expect(upsertDiaryMock).toHaveBeenCalledWith(
    expect.objectContaining({ text: '수정됨' }),
  );
  expect(document.body.textContent).toContain('일기를 저장했어요!');
});
```

Key assertions: `upsertDiary` called with updated text; toast text visible.

Note: The ✓ save icon button must have `aria-label="저장"` so `btn('저장')` can find it.

---

#### Case C7 — ✓ icon absent when not dirty

Description: When the editor has no unsaved changes (`isDirty === false`), the ✓ save icon is not rendered.

```ts
it('save icon absent when not dirty', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '변경 없음' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  // No changes made — isDirty=false — ✓ icon must not be in the DOM
  const allLabels = Array.from(document.querySelectorAll('button'))
    .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '').join('');
  expect(allLabels).not.toContain('저장');
});
```

Key assertion: no button with `aria-label="저장"` or save text in DOM when not dirty.

---

#### Case C8 — Dirty state + back arrow → unsaved dialog opens (not router.back())

Description: After making a change (dirty), tapping the back button opens the unsaved-changes `ConfirmDialog` rather than navigating away.

```ts
it('dirty + back → unsaved dialog shown; router.back not called', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '수정됨' } });

  fireEvent.click(btn('뒤로가기'));

  // The unsaved dialog message must be visible
  expect(document.body.textContent).toContain('저장되지 않은 변경사항이 있어요');
  expect(mockRouter.back).not.toHaveBeenCalled();
});
```

Key assertions: dialog text visible; `router.back` not called.

Note: The back `IconButton` must have `aria-label="뒤로가기"`.

---

#### Case C9 — "저장하고 나가기" in unsaved dialog → upsertDiary + router.back()

Description: When the unsaved-changes dialog is open and the user taps the confirm button, `upsertDiary` is called and then `router.back()` is called.

```ts
it('"저장하고 나가기" → upsertDiary + router.back called', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'original' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '수정됨' } });

  // Open unsaved dialog via back tap
  fireEvent.click(btn('뒤로가기'));

  // Click the confirm action
  fireEvent.click(btn('저장하고 나가기'));

  expect(upsertDiaryMock).toHaveBeenCalledTimes(1);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  // Confirm comes before back
  expect(upsertDiaryMock.mock.invocationCallOrder[0]).toBeLessThan(
    mockRouter.back.mock.invocationCallOrder[0],
  );
});
```

Key assertions: `upsertDiary` called before `router.back()`.

---

#### Case C10 — more-menu delete → confirm → removeDiary(id) + router.back()

Description: For an existing entry, opening the more menu and tapping delete opens the delete `ConfirmDialog`. Confirming calls `removeDiary(entry.id)` and then `router.back()`.

```ts
it('delete confirm → removeDiary(id) + router.back', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '삭제할 일기' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  // Open more menu
  fireEvent.click(btn('더보기'));
  // Tap delete item
  fireEvent.click(btn('일기 삭제'));
  // Confirm delete
  fireEvent.click(btn('삭제'));

  expect(removeDiaryMock).toHaveBeenCalledWith(entry.id);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});
```

Key assertions: `removeDiary` called with the correct `id` (not `date`); `router.back()` called.

---

#### Case C11 — MoodIcon tap → mood sheet opens with mode='change', selectedMoodId=current

Description: When an existing entry has mood='joy', tapping the mood icon opens `MoodPickerSheet` with `mode='change'` and the joy button highlighted.

```ts
it('mood icon tap → mood sheet opens with mode=change and selectedMoodId', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: '' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  // Reset showModal count (may have been called by other dialogs on load)
  showModalMock.mockClear();

  // Tap the mood icon button
  fireEvent.click(btn('기분 변경'));

  // showModal should have been called again (mood sheet opened)
  expect(showModalMock).toHaveBeenCalled();
  // MoodPickerSheet renders mood buttons — joy should have ring (selected)
  const joyBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === '기쁨',
  );
  expect(joyBtn).toBeTruthy();
  expect(joyBtn?.className).toContain('ring-2');
});
```

Key assertions: `showModal` called again; mood sheet visible; selected mood button has `ring-2` class.

Note: Mood tap button `aria-label` must be `"기분 변경"`.

---

#### Case C12 — Time icon tap inserts HH:MM at cursor position

Description: With fake timers set to 14:30, tapping the time insert icon inserts `"14:30 "` at the current cursor position.

```ts
it('time icon inserts HH:MM at cursor', async () => {
  // Set fake time to 14:30
  vi.setSystemTime(new Date('2026-05-15T14:30:00.000'));

  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'before' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  // Set cursor to end of "before" (position 6)
  textarea.setSelectionRange(6, 6);

  fireEvent.click(btn('현재 시간 삽입'));

  // Textarea value should now be "before14:30 "
  expect(textarea.value).toBe('before14:30 ');
});
```

Key assertions: `textarea.value` contains `"14:30 "` inserted at the expected position.

Note: Time insert button `aria-label` must be `"현재 시간 삽입"`. `vi.setSystemTime(...)` controls `new Date()` output.

---

## E2E Tests

### File 4 — `e2e/editor.spec.ts`

One Playwright test. The date is computed dynamically at runtime to avoid hardcoded date dependencies.

```ts
import { test, expect } from '@playwright/test';

test('캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시', async ({ page }) => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Navigate directly to the editor for today (empty entry)
  await page.goto(`/diary/${dateStr}`);

  // Mood picker sheet should auto-open
  await expect(page.getByText('오늘은 어떤 하루였나요?')).toBeVisible();

  // Select the first mood (기쁨 / joy)
  await page.getByRole('button', { name: '기쁨' }).click();

  // Sheet should close; editor textarea visible
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toBeVisible();

  // Type in the textarea
  await page.getByPlaceholder('오늘 어떤 하루였나요?').fill('E2E 테스트 일기');

  // Wait for autosave debounce (1000ms + buffer)
  await page.waitForTimeout(1500);

  // Navigate back to calendar
  await page.getByRole('button', { name: '뒤로가기' }).click();

  // Must be back on calendar route
  await expect(page).toHaveURL('/');

  // The calendar should show a mood emoji on today's cell
  const todayCell = page.getByRole('button', { name: new RegExp(dateStr) });
  await expect(todayCell).toBeVisible();
  // The cell should contain a mood emoji (non-empty, non-digit-only text content)
  const cellText = await todayCell.textContent();
  expect(cellText?.trim()).not.toBe('');
  expect(cellText).not.toMatch(/^\d+$/);
});
```

Key assertions:
- Mood picker opens on empty cell navigation
- Mood selection closes the picker and shows textarea
- `waitForTimeout(1500)` allows the 1-second autosave to fire
- Back navigation returns to `/`
- Today's calendar cell has visible mood emoji (not just a number)

---

### File 5 — `src/design-system/__tests__/useDialogControl.test.ts` (extend existing)

The existing file at `/Users/jay/Documents/Projects/ai_diary/src/design-system/__tests__/useDialogControl.test.ts` has 5 cases. Add 2 new `it(...)` cases inside the existing `describe('useDialogControl', ...)` block. The `TestDialog` wrapper, `beforeEach`, and `afterEach` blocks remain unchanged.

---

#### Case D1 — Escape key fires onClose via cancel event

Description: Dispatching a native `cancel` event on the `<dialog>` element triggers `onClose`. This validates the new `cancel` event listener added to `useDialogControl`.

```ts
it('cancel event (Escape key) calls onClose', () => {
  const onClose = vi.fn();
  render(React.createElement(TestDialog, { open: true, onClose }));
  const dialogEl = document.querySelector('dialog') as HTMLDialogElement;

  act(() => {
    dialogEl.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));
  });

  expect(onClose).toHaveBeenCalledTimes(1);
});
```

Key assertion: `onClose` called once after `cancel` event dispatch.

---

#### Case D2 — cancel event does not fire extra onClose call when open=false and listener is removed

Description: After transitioning to `open=false`, the effect cleanup removes the `cancel` listener. Dispatching a `cancel` event must not produce an additional `onClose` call.

```ts
it('cancel event after open=false does not call onClose again', () => {
  const onClose = vi.fn();
  const { rerender } = render(
    React.createElement(TestDialog, { open: true, onClose }),
  );
  act(() => {
    rerender(React.createElement(TestDialog, { open: false, onClose }));
  });
  const callCountAfterClose = onClose.mock.calls.length;

  const dialogEl = document.querySelector('dialog') as HTMLDialogElement;
  act(() => {
    dialogEl.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));
  });

  // Listener was removed — no new calls
  expect(onClose.mock.calls.length).toBe(callCountAfterClose);
});
```

Key assertion: `onClose` call count does not increase after the listener is cleaned up.

---

## Regression Tests

The following existing tests must continue to pass after REQ-009 changes (run as part of `npm run test`):

- `src/design-system/__tests__/BottomSheet.test.tsx` — `useDialogControl` change must not break backdrop-click behavior
- `src/design-system/__tests__/ConfirmDialog.test.tsx` — same
- `src/design-system/__tests__/MoodPickerSheet.test.tsx` — same; the X-button in `mode='initial'` test verifies `onCancelInitial` still fires correctly
- `src/app/__tests__/diary-date-page.test.tsx` — `page.tsx` is modified; date validation tests must remain green

---

## Security-Relevant Tests

No HTTP calls. No authentication. No user-supplied content is executed. The autosave guard (Case C5) prevents blind writes to localStorage when mood is undefined, which is the only data-integrity-relevant invariant.

No additional security tests are required.

---

## Commands to Run

```bash
# Typecheck (catches interface mismatches in new hooks/components)
npm run typecheck

# All unit and integration tests (single pass)
npm run test

# Run only REQ-009 related test files during development
npx vitest run src/lib/hooks/__tests__/useAutosave.test.ts
npx vitest run src/lib/hooks/__tests__/useEditorState.test.ts
npx vitest run "src/app/diary/\[date\]/__tests__/Editor.test.tsx"
npx vitest run src/design-system/__tests__/useDialogControl.test.ts

# E2E (requires dev server; Playwright starts it automatically)
npm run test:e2e
```

---

## Not Applicable Tests

- **Backend/API tests**: REQ-009 is purely client-side (localStorage). No server-side code.
- **Database migration tests**: No schema changes.
- **Auth tests**: Single-user local app, no auth.
- **Performance / load tests**: MVP scale; localStorage is synchronous and trivially fast.
- **Snapshot tests**: The project has no snapshot testing convention.

---

## Coverage Gap Notes (Non-blocking)

The following invariants from the API contract are not directly asserted by the 12+5+2+1 test cases. They are deferred (not blocking):

1. **INV-A1/INV-A2 (unstable `saveFn`/`value` defeats debounce):** The test plan verifies debounce behavior with a stable `saveFn` and primitive `value`. A test verifying that an unstable reference re-schedules the timer on every render is omitted — impractical without a test-only prop.

2. **`textAlign` persisted on save (INV-3):** Case C6 uses `objectContaining({ text: '수정됨' })` but does not assert `textAlign`. Adding `textAlign` to the matcher would make this invariant explicit.

3. **INV-11 (LOAD_ENTRY dispatched exactly once per mount):** Not directly counted. Indirect evidence: Case B3 checks that state is populated correctly, which would fail if `LOAD_ENTRY` fired multiple times and reset `snapshot` between user actions.

4. **INV-13 (`textAlign ?? 'left'` fallback for legacy data):** `fixtures.ts` always includes `textAlign: 'left'`; no test exercises the `undefined` runtime fallback.

5. **INV-10 (Escape on `MoodPickerSheet` in `mode='initial'` calls `onCancelInitial`):** Cases D1/D2 verify the cancel-event mechanism in `useDialogControl`. The end-to-end chain (Escape → `onCancelInitial` → `router.back()`) is not tested at the component level. The `MoodPickerSheet` test file (TC-7) already confirms X-button in `mode='initial'` calls `onCancelInitial`. The gap is a combined "Escape on MoodPickerSheet" test — deferred.

6. **`hasSavedEntry=false` hides delete in `EditorMoreMenu` without opening menu:** Case C1 checks that delete text is absent overall, but does not open the ⋯ menu. Full coverage would open the menu for a new entry and assert the delete item is absent. Deferred.

---

## Verdict
PASS

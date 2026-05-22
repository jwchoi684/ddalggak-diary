# Test Plan — REQ-010: 에디터 내 가로 캘린더 인라인 드롭다운

## Summary

REQ-010 introduces a collapsible horizontal date strip inside the diary editor. The strip
appears when the user taps the date label (converted to a `<button>`), shows ±30 days centred on
the current date, and lets the user switch dates while autosaving the current entry. The feature
spans one new hook, two new components, and modifications to two existing components.

Test surface:
- `useHorizontalDatePicker` hook — toggle, dateRange, entryMap, handleDateSelect happy/failure/same-date paths (7 unit cases)
- `DateCell` component — rendering states, ARIA, visual emphasis (8 unit cases)
- `HorizontalDatePicker` component — cell count, role/aria, scroll-on-mount, conditional mount (4 unit cases)
- `Editor` component integration — strip toggle, date-switch flow, mood-modal auto-open (3 integration cases added to existing file)
- E2E — full data-preservation journey across two seeded dates (2 Playwright cases)

Total new tests: **22** (19 unit/integration + 3 E2E).
Existing tests: the 215 tests from prior REQs must remain green.

---

## Unit Tests

### File 1 — `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts`

**Environment directive:** `// @vitest-environment happy-dom`

**Framework:** Vitest 2 + `@testing-library/react` `renderHook` + `act`. Same pattern as
`useAutosave.test.ts`.

**Mocks required:**
- `vi.mock('@/lib/storage', ...)` — `readDiaries` returns controllable array;
  `upsertDiary` is a no-op by default, throws on demand.
- `saveFn` is a plain `vi.fn()` passed as an option — no storage involvement at the hook level.

```ts
vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return { ...original, readDiaries: vi.fn(() => []), upsertDiary: vi.fn() };
});

const { readDiaries } = await import('@/lib/storage');
const readDiariesMock = readDiaries as ReturnType<typeof vi.fn>;
const { useHorizontalDatePicker } = await import('@/lib/hooks/useHorizontalDatePicker');
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');
```

**beforeEach / afterEach:**
```ts
beforeEach(() => { vi.clearAllMocks(); readDiariesMock.mockReturnValue([]); });
afterEach(() => { cleanup(); });
```

---

#### Case H1 — `isOpen` initial state is false; `toggle()` sets it to true

```ts
it('H1: isOpen starts false; toggle() opens the strip', () => {
  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn: vi.fn(),
      autosaveValue: { mood: 'joy', text: '', textAlign: 'left' },
      onDateChange: vi.fn(),
      onSaveError: vi.fn(),
    }),
  );
  expect(result.current.isOpen).toBe(false);
  act(() => { result.current.toggle(); });
  expect(result.current.isOpen).toBe(true);
});
```

Key assertions: `isOpen` false on init; true after one `toggle()`.

---

#### Case H2 — `close()` sets `isOpen` to false from true

```ts
it('H2: close() returns isOpen to false', () => {
  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn: vi.fn(),
      autosaveValue: { mood: 'joy', text: '', textAlign: 'left' },
      onDateChange: vi.fn(),
      onSaveError: vi.fn(),
    }),
  );
  act(() => { result.current.toggle(); }); // open
  act(() => { result.current.close(); });  // close
  expect(result.current.isOpen).toBe(false);
});
```

---

#### Case H3 — `dateRange` has exactly 61 items, sorted ascending, centred on `currentDate`

```ts
it('H3: dateRange is 61 items, sorted ascending, currentDate is at index 30', () => {
  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn: vi.fn(),
      autosaveValue: { mood: undefined, text: '', textAlign: 'left' },
      onDateChange: vi.fn(),
      onSaveError: vi.fn(),
    }),
  );
  const { dateRange } = result.current;
  expect(dateRange).toHaveLength(61);
  // sorted ascending
  for (let i = 1; i < dateRange.length; i++) {
    expect(dateRange[i] > dateRange[i - 1]).toBe(true);
  }
  // currentDate is at the midpoint
  expect(dateRange[30]).toBe('2026-05-22');
  // boundaries
  expect(dateRange[0]).toBe('2026-04-22');
  expect(dateRange[60]).toBe('2026-06-21');
});
```

Key assertions: length 61, sorted, index 30 is `currentDate`, edges are −30d / +30d.

---

#### Case H4 — `entryMap` is built from `readDiaries()` when strip opens

Description: `entryMap` should be empty before strip opens. After `toggle()` (open),
`entryMap` should reflect what `readDiaries()` returns.

```ts
it('H4: entryMap is populated from readDiaries on open', () => {
  const entry = makeDiary({ date: '2026-05-22', mood: 'joy' });
  readDiariesMock.mockReturnValue([entry]);

  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn: vi.fn(),
      autosaveValue: { mood: 'joy', text: '', textAlign: 'left' },
      onDateChange: vi.fn(),
      onSaveError: vi.fn(),
    }),
  );

  // entryMap computed via useMemo([isOpen]) — check after open
  act(() => { result.current.toggle(); });
  expect(result.current.entryMap.get('2026-05-22')).toMatchObject({ date: '2026-05-22', mood: 'joy' });
});
```

---

#### Case H5 — `handleDateSelect` happy path: `saveFn` called → `onDateChange` called → strip closed

```ts
it('H5: handleDateSelect happy path — saveFn → onDateChange → strip closes', () => {
  const saveFn = vi.fn();
  const onDateChange = vi.fn();
  const onSaveError = vi.fn();

  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn,
      autosaveValue: { mood: 'joy', text: 'hello', textAlign: 'left' },
      onDateChange,
      onSaveError,
    }),
  );

  act(() => { result.current.toggle(); }); // open
  act(() => { result.current.handleDateSelect('2026-05-23'); });

  expect(saveFn).toHaveBeenCalledTimes(1);
  expect(saveFn).toHaveBeenCalledWith({ mood: 'joy', text: 'hello', textAlign: 'left' });
  expect(onDateChange).toHaveBeenCalledWith('2026-05-23');
  expect(onSaveError).not.toHaveBeenCalled();
  expect(result.current.isOpen).toBe(false);
  // saveFn called before onDateChange
  expect(saveFn.mock.invocationCallOrder[0]).toBeLessThan(
    onDateChange.mock.invocationCallOrder[0],
  );
});
```

Key invariant: save-before-switch order is asserted via `invocationCallOrder`.

---

#### Case H6 — `handleDateSelect` failure path: `saveFn` throws → `onSaveError` called, `onDateChange` NOT called, strip stays open

```ts
it('H6: handleDateSelect failure — saveFn throws → onSaveError, onDateChange skipped, strip stays open', () => {
  const quotaError = Object.assign(new DOMException('QuotaExceededError'), { name: 'QuotaExceededError' });
  const saveFn = vi.fn(() => { throw quotaError; });
  const onDateChange = vi.fn();
  const onSaveError = vi.fn();

  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn,
      autosaveValue: { mood: 'joy', text: 'hello', textAlign: 'left' },
      onDateChange,
      onSaveError,
    }),
  );

  act(() => { result.current.toggle(); }); // open
  act(() => { result.current.handleDateSelect('2026-05-23'); });

  expect(onSaveError).toHaveBeenCalledTimes(1);
  expect(onSaveError).toHaveBeenCalledWith(expect.stringContaining('저장에 실패'));
  expect(onDateChange).not.toHaveBeenCalled();
  expect(result.current.isOpen).toBe(true); // still open
});
```

Key assertion: `isOpen` stays true; `onDateChange` never called; `onSaveError` gets a Korean string.

---

#### Case H7 — Same-date `handleDateSelect`: `saveFn` called but `onDateChange` NOT called; strip closes

```ts
it('H7: same-date tap — saveFn called (no-op if no mood), onDateChange skipped, strip closes', () => {
  const saveFn = vi.fn();
  const onDateChange = vi.fn();

  const { result } = renderHook(() =>
    useHorizontalDatePicker({
      currentDate: '2026-05-22',
      saveFn,
      autosaveValue: { mood: 'joy', text: '', textAlign: 'left' },
      onDateChange,
      onSaveError: vi.fn(),
    }),
  );

  act(() => { result.current.toggle(); });
  act(() => { result.current.handleDateSelect('2026-05-22'); }); // same date

  expect(saveFn).toHaveBeenCalledTimes(1);
  expect(onDateChange).not.toHaveBeenCalled();
  expect(result.current.isOpen).toBe(false);
});
```

**Test count for File 1: 7 cases.**

---

### File 2 — `src/app/diary/[date]/_components/__tests__/DateCell.test.tsx`

**Environment directive:** `// @vitest-environment happy-dom`

**Framework:** `render` + `screen` + `fireEvent` from `@testing-library/react`.

**No storage or navigation mocks required** — `DateCell` is a pure presentational component.

**Fixture:** `makeDiary` from `@/lib/storage/__tests__/fixtures`. `TODAY` constant is set to
`'2026-05-22'` and `vi.setSystemTime` is not needed since `isToday` is passed as a prop.

```ts
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateCell } from '@/app/diary/[date]/_components/DateCell';
const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');
```

**afterEach:** `cleanup();`

---

#### Case DC1 — Renders `MoodIcon` when entry has a valid mood

```ts
it('DC1: entry with mood — renders MoodIcon (role=img with mood label)', () => {
  const entry = makeDiary({ date: '2026-05-22', mood: 'joy' });
  render(
    <DateCell date="2026-05-22" entry={entry} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  // MoodIcon renders <span role="img" aria-label="기쁨">
  expect(screen.getByRole('img', { name: '기쁨' })).toBeTruthy();
});
```

---

#### Case DC2 — Renders day number only when no entry

```ts
it('DC2: no entry — renders day number, no mood icon', () => {
  render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole('option').textContent).toContain('22');
  expect(screen.queryByRole('img')).toBeNull();
});
```

Key assertion: numeric day present, no `img` role element.

---

#### Case DC3 — Entry with falsy mood renders `•` placeholder, not a crash

```ts
it('DC3: entry with falsy mood — renders • placeholder, does not crash', () => {
  const entry = makeDiary({ date: '2026-05-10', mood: undefined as unknown as 'joy' });
  render(
    <DateCell date="2026-05-10" entry={entry} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole('option').textContent).toContain('•');
});
```

---

#### Case DC4 — `aria-selected` reflects `isSelected` prop

```ts
it('DC4: isSelected=true → aria-selected="true"; false → "false"', () => {
  const { rerender } = render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={false} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true');

  rerender(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('false');
});
```

---

#### Case DC5 — `aria-label` is Korean date string (e.g. "2026년 5월 22일")

```ts
it('DC5: aria-label is Korean date string', () => {
  render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  const cell = screen.getByRole('option');
  expect(cell.getAttribute('aria-label')).toMatch(/2026.*5.*22/);
  // Must contain Korean characters (year/month/day suffixes)
  expect(cell.getAttribute('aria-label')).toMatch(/년|월|일/);
});
```

---

#### Case DC6 — Selected cell has peach pill class; unselected does not

```ts
it('DC6: isSelected — peach pill class applied; not applied when false', () => {
  const { rerender } = render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={false} onSelect={vi.fn()} />,
  );
  const cell = screen.getByRole('option');
  expect(cell.className).toMatch(/bg-peach|peach/);

  rerender(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
  );
  expect(screen.getByRole('option').className).not.toMatch(/bg-peach|peach/);
});
```

Note: if the implementation uses inline style instead of Tailwind class, adapt assertion to
`style.backgroundColor` matching `#F5C896`.

---

#### Case DC7 — Today dot present when `isToday && !isSelected`; absent when `isSelected`

```ts
it('DC7: today dot visible when isToday && !isSelected; hidden when isSelected', () => {
  const { rerender } = render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={true} onSelect={vi.fn()} />,
  );
  // Today dot: a div/span with specific w-1 h-1 rounded-full classes (or data-testid)
  // We match by data-testid="today-dot" — implementer must add this testid
  expect(document.querySelector('[data-testid="today-dot"]')).not.toBeNull();

  rerender(
    <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={true} onSelect={vi.fn()} />,
  );
  expect(document.querySelector('[data-testid="today-dot"]')).toBeNull();
});
```

Implementer note: add `data-testid="today-dot"` to the dot span in `DateCell.tsx`.

---

#### Case DC8 — `onSelect` called with correct date on click

```ts
it('DC8: clicking cell calls onSelect with the date', () => {
  const onSelect = vi.fn();
  render(
    <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={onSelect} />,
  );
  fireEvent.click(screen.getByRole('option'));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('2026-05-22');
});
```

**Test count for File 2: 8 cases.**

---

### File 3 — `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx`

**Environment directive:** `// @vitest-environment happy-dom`

**Framework:** `render` + `screen` from `@testing-library/react`.

**Mocks required:**
- `scrollIntoView` on `HTMLElement.prototype` (happy-dom may not implement it):
  ```ts
  const scrollIntoViewMock = vi.fn();
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });
  afterEach(() => {
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    vi.restoreAllMocks();
    cleanup();
  });
  ```

**Shared helpers:**

```ts
function makeRange(current: string, size = 61): string[] {
  // builds a minimal dateRange centred on current; used to avoid importing the hook
  const result: string[] = [];
  const base = new Date(current + 'T00:00:00');
  for (let i = 0; i < size; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - 30 + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}
```

---

#### Case HP1 — Renders exactly `dateRange.length` cells

```ts
it('HP1: renders one DateCell per dateRange entry', () => {
  const currentDate = '2026-05-22';
  const dateRange = makeRange(currentDate, 61);
  render(
    <HorizontalDatePicker
      currentDate={currentDate}
      dateRange={dateRange}
      entryMap={new Map()}
      onDateSelect={vi.fn()}
    />,
  );
  const cells = screen.getAllByRole('option');
  expect(cells).toHaveLength(61);
});
```

---

#### Case HP2 — Selected cell (matching `currentDate`) has `aria-selected="true"`, others "false"

```ts
it('HP2: only the currentDate cell has aria-selected=true', () => {
  const currentDate = '2026-05-22';
  const dateRange = makeRange(currentDate, 5); // small range for speed
  render(
    <HorizontalDatePicker
      currentDate={currentDate}
      dateRange={dateRange}
      entryMap={new Map()}
      onDateSelect={vi.fn()}
    />,
  );
  const selectedCells = screen.getAllByRole('option').filter(
    (el) => el.getAttribute('aria-selected') === 'true',
  );
  expect(selectedCells).toHaveLength(1);
  expect(selectedCells[0].getAttribute('aria-label')).toMatch(/22/);
});
```

---

#### Case HP3 — Strip container has `role="listbox"` and `aria-label="가로 캘린더"`

```ts
it('HP3: container has role=listbox and aria-label in Korean', () => {
  const currentDate = '2026-05-22';
  render(
    <HorizontalDatePicker
      currentDate={currentDate}
      dateRange={makeRange(currentDate, 3)}
      entryMap={new Map()}
      onDateSelect={vi.fn()}
    />,
  );
  const listbox = screen.getByRole('listbox');
  expect(listbox).toBeTruthy();
  expect(listbox.getAttribute('aria-label')).toBe('가로 캘린더');
});
```

---

#### Case HP4 — `scrollIntoView` is called on mount for the selected cell

```ts
it('HP4: scrollIntoView called on mount to centre selected cell', () => {
  const currentDate = '2026-05-22';
  render(
    <HorizontalDatePicker
      currentDate={currentDate}
      dateRange={makeRange(currentDate, 61)}
      entryMap={new Map()}
      onDateSelect={vi.fn()}
    />,
  );
  // scrollIntoView should have been called at least once
  expect(scrollIntoViewMock).toHaveBeenCalled();
  expect(scrollIntoViewMock).toHaveBeenCalledWith(
    expect.objectContaining({ inline: 'center', behavior: 'instant' }),
  );
});
```

Note: if `HorizontalDatePicker` calls `scrollIntoView` on the cell element directly (not via
`querySelector`), the mock on `HTMLElement.prototype` will capture it. If the implementation
calls it via a ref, verify the ref's element is an HTMLElement.

**Test count for File 3: 4 cases.**

---

## Integration Tests

### File 4 — `src/app/diary/[date]/__tests__/Editor.test.tsx` (extend existing)

Add 3 new cases inside the existing `describe('Editor', ...)` block. All mock setup,
`beforeEach`, `afterEach`, and helpers (`btn`, `renderEditor`) remain unchanged from the
existing file. No new mocks or imports are needed — the existing storage and navigation mocks
are sufficient.

---

#### Case C-strip-1 — Tapping date label toggles strip (`aria-expanded` changes)

```ts
it('C-strip-1: tapping date label opens strip (aria-expanded toggles)', async () => {
  const entry = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'hello' });
  readDiariesMock.mockReturnValue([entry]);
  await renderEditor();

  // Date toggle button (aria-label="날짜 선택")
  const toggleBtn = document.querySelector('button[aria-label="날짜 선택"]');
  expect(toggleBtn).not.toBeNull();
  expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(toggleBtn!);
  await act(async () => {});

  expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
  // Strip container mounted
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();

  // Tap again — strip closes
  fireEvent.click(toggleBtn!);
  await act(async () => {});
  expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
  expect(document.querySelector('[role="listbox"]')).toBeNull();
});
```

Key assertions: `aria-expanded` transitions false→true→false; `role="listbox"` mounts and unmounts.

---

#### Case C-strip-2 — Tapping a strip cell with valid mood saves old date and switches editor content

```ts
it('C-strip-2: tapping a different date cell saves current date and loads new date', async () => {
  const entryA = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'date A content' });
  const entryB = makeDiary({ date: '2026-05-16', mood: 'calm', text: 'date B content' });
  readDiariesMock.mockReturnValue([entryA, entryB]);
  await renderEditor('2026-05-15');

  // Open strip
  fireEvent.click(document.querySelector('button[aria-label="날짜 선택"]')!);
  await act(async () => {});

  // Find the cell for 2026-05-16 (aria-label contains "16일")
  const cellB = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(
    (el) => el.getAttribute('aria-label')?.includes('16'),
  );
  expect(cellB).toBeTruthy();

  upsertDiaryMock.mockClear();
  fireEvent.click(cellB!);
  await act(async () => {});

  // upsertDiary called (saving date A)
  expect(upsertDiaryMock).toHaveBeenCalledWith(
    expect.objectContaining({ date: '2026-05-15' }),
  );
  // Editor now shows date B's content
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  expect(textarea.value).toBe('date B content');
  // Strip closed
  expect(document.querySelector('[role="listbox"]')).toBeNull();
});
```

Key assertions: `upsertDiary` called for old date; textarea reflects new date's content; strip unmounts.

---

#### Case C-strip-3 — Switching to a date with no entry → `MoodPickerSheet` auto-opens

```ts
it('C-strip-3: switching to empty date auto-opens MoodPickerSheet', async () => {
  const entryA = makeDiary({ date: '2026-05-15', mood: 'joy', text: 'A' });
  // No entry for 2026-05-16
  readDiariesMock.mockReturnValue([entryA]);
  await renderEditor('2026-05-15');

  showModalMock.mockClear();

  // Open strip
  fireEvent.click(document.querySelector('button[aria-label="날짜 선택"]')!);
  await act(async () => {});

  // Tap the cell for 2026-05-16
  const emptyCell = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find(
    (el) => el.getAttribute('aria-label')?.includes('16'),
  );
  fireEvent.click(emptyCell!);
  await act(async () => {}); // flush useEditorState reload useEffect

  // MoodPickerSheet should auto-open (showModal called again)
  expect(showModalMock).toHaveBeenCalled();
});
```

Key assertion: `showModal` called after switching to an empty date, proving the mood picker
auto-opens (matches `moodSheetMode === 'initial'` path in `useEditorState`).

**New test count for File 4: 3 cases (total file: 15 cases).**

---

## E2E Tests

### File 5 — `e2e/horizontal-date-picker.spec.ts` (new Playwright spec)

**Framework:** Playwright 1.60, Chromium only, same `playwright.config.ts` as existing specs.
**Seed helper:** `seedDiariesScript` from `e2e/_helpers/seedDiaries.ts`.

Two companion dates are used: `DATE_A` (yesterday) and `DATE_B` (today). Both are seeded with
entries. The test navigates to DATE_A's editor, opens the strip, taps DATE_B, and verifies:
1. URL does NOT change (stays at DATE_A).
2. Editor content switches to DATE_B.
3. DATE_A's localStorage entry is intact.

```ts
import { test, expect } from '@playwright/test';
import { seedDiariesScript } from './_helpers/seedDiaries';
import type { DiaryEntry } from '@/lib/storage/types';

function isoDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
```

---

#### Case E1 — Date switch preserves date A entry; editor shows date B content; URL unchanged

```ts
test('E1: switch from date A to date B — date A preserved, editor shows B, URL stays at A', async ({ page }) => {
  const DATE_A = isoDate(-1);
  const DATE_B = isoDate(0);

  const entryA: DiaryEntry = {
    id: 'e2e-a',
    date: DATE_A,
    mood: 'joy',
    text: 'Entry A text',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const entryB: DiaryEntry = {
    id: 'e2e-b',
    date: DATE_B,
    mood: 'calm',
    text: 'Entry B text',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.addInitScript(seedDiariesScript([entryA, entryB]));
  await page.goto(`/diary/${DATE_A}`);

  // Editor for date A loaded
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry A text');

  // Open horizontal date strip
  await page.getByRole('button', { name: '날짜 선택' }).click();
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).toBeVisible();

  // Tap the cell for DATE_B
  const dayB = new Date(DATE_B).getDate().toString();
  await page.getByRole('option', { name: new RegExp(dayB) }).first().click();

  // URL must NOT change — stays at date A
  await expect(page).toHaveURL(`/diary/${DATE_A}`);

  // Editor body now shows date B's content
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry B text');

  // Strip must be closed
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).not.toBeVisible();

  // Date A's localStorage entry is still intact
  const storedRaw = await page.evaluate(() =>
    localStorage.getItem('ddalkkak:diaries:v1'),
  );
  const stored: DiaryEntry[] = JSON.parse(storedRaw ?? '[]');
  const preservedA = stored.find((e: DiaryEntry) => e.id === 'e2e-a');
  expect(preservedA).toBeTruthy();
  expect(preservedA?.text).toBe('Entry A text');
});
```

---

#### Case E2 — No-mood guard: switching dates without mood does not create an entry for date A

```ts
test('E2: no-mood on date A — date switch does not persist a partial entry for date A', async ({ page }) => {
  const DATE_A = isoDate(-2);
  const DATE_B = isoDate(-1);

  // Seed only date B; date A has no entry (will open as new entry with mood picker)
  const entryB: DiaryEntry = {
    id: 'e2e-b2',
    date: DATE_B,
    mood: 'sad',
    text: 'Entry B only',
    textAlign: 'left',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.addInitScript(seedDiariesScript([entryB]));

  // Navigate to date A (no entry → mood picker opens automatically)
  await page.goto(`/diary/${DATE_A}`);
  // Close mood picker without selecting (use the X or Escape if available)
  // The strip should still be operable even with no mood on date A
  // Dismiss the mood picker — tap backdrop or cancel
  await page.keyboard.press('Escape');
  // Wait for editor to be interactive (mood picker closed)
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toBeVisible();

  // Type some text without selecting a mood
  await page.getByPlaceholder('오늘 어떤 하루였나요?').fill('Unsaved text no mood');

  // Open strip and switch to date B
  await page.getByRole('button', { name: '날짜 선택' }).click();
  await expect(page.getByRole('listbox', { name: '가로 캘린더' })).toBeVisible();

  const dayB = new Date(DATE_B).getDate().toString();
  await page.getByRole('option', { name: new RegExp(dayB) }).first().click();

  // Editor shows date B content
  await expect(page.getByPlaceholder('오늘 어떤 하루였나요?')).toHaveValue('Entry B only');

  // Date A must NOT have been written to localStorage (saveFn exits early when mood=undefined)
  const storedRaw = await page.evaluate(() =>
    localStorage.getItem('ddalkkak:diaries:v1'),
  );
  const stored: DiaryEntry[] = JSON.parse(storedRaw ?? '[]');
  const spuriousA = stored.find((e: DiaryEntry) => e.date === DATE_A);
  expect(spuriousA).toBeUndefined();
});
```

**Test count for File 5: 2 E2E cases.**

---

## Regression Tests

The following existing test files must remain green after REQ-010 changes land:

| File | Why at risk |
|---|---|
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | `Editor.tsx` and `EditorBody.tsx` are modified — prop interface expands |
| `src/app/__tests__/diary-date-page.test.tsx` | `page.tsx` may be modified if `Editor` props change; date-validation tests must hold |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | `MoodPickerSheet` prop `date` now receives `currentDate` — ensure no mismatch |
| `src/design-system/__tests__/useDialogControl.test.ts` | Already passing; verify no regression from `useHorizontalDatePicker` interactions |

All existing 215 tests must continue to pass. A full `npm run test` must show 0 failures before the PR is opened.

---

## Security-Relevant Tests

No HTTP calls, no auth, no user content is executed. The following data-safety invariant is
exercised by the test plan:

- **H6** verifies that a failed save blocks date navigation — preventing silent data loss on
  `QuotaExceededError`.
- **H5** verifies save-before-switch ordering — no optimistic navigation.
- **E2** verifies that an unsaved entry with no mood is NOT written to storage (saveFn early-return
  guard prevents a partial/corrupt entry from being persisted under a different date).

No additional security tests are required for a client-only localStorage feature.

---

## Fixtures / Mocks Needed

| Mock / Fixture | Purpose | Pattern |
|---|---|---|
| `vi.mock('@/lib/storage')` with `readDiaries: vi.fn(() => [])` | Controls `entryMap` content in hook tests | Same as existing `useEditorState.test.ts` |
| `saveFn = vi.fn()` | Passed directly as option to hook — no storage layer involved | Plain `vi.fn()` |
| `saveFn = vi.fn(() => { throw quotaError; })` | H6 failure path | `DOMException` with name `QuotaExceededError` |
| `HTMLElement.prototype.scrollIntoView = vi.fn()` | HP4 scroll-on-mount | Override in `beforeEach`; delete in `afterEach` |
| `HTMLDialogElement.prototype.showModal / close` mocks | C-strip-3 (existing Editor pattern) | Already in `Editor.test.tsx` `beforeEach` |
| `makeDiary` from `fixtures.ts` | All unit and integration tests | Existing factory — no new fixtures needed |
| `seedDiariesScript` from `e2e/_helpers/seedDiaries.ts` | E1, E2 localStorage pre-population | Existing helper — no changes needed |
| `data-testid="today-dot"` on the dot span in `DateCell.tsx` | DC7 today-dot assertion | Implementer must add this testid |

---

## Commands to Run

```bash
# Type check first (catches interface mismatches before running tests)
npm run typecheck

# Run all unit + integration tests
npm run test

# Run only REQ-010 new test files during development
npx vitest run src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts
npx vitest run "src/app/diary/\[date\]/_components/__tests__/DateCell.test.tsx"
npx vitest run "src/app/diary/\[date\]/_components/__tests__/HorizontalDatePicker.test.tsx"
npx vitest run "src/app/diary/\[date\]/__tests__/Editor.test.tsx"

# Run full regression suite (must be 0 failures)
npm run test

# E2E (Playwright starts dev server automatically)
npm run test:e2e -- --spec e2e/horizontal-date-picker.spec.ts
```

---

## Not Applicable Tests

- **Backend / API tests**: REQ-010 is client-only. No server routes, no HTTP calls.
- **Database migration tests**: localStorage schema is unchanged. No migration.
- **Auth tests**: Single-user local app, no authentication.
- **Performance / load tests**: 61 static cells; O(n) localStorage scan on open. MVP scale.
- **Snapshot tests**: No snapshot testing convention in this project.
- **Virtual scroll tests**: Virtual scroll is explicitly a non-goal in REQ-010.
- **Keyboard ESC dismiss**: The strip is not modal; no ESC handler is implemented per spec.
- **Outside-click dismiss**: Explicitly excluded from scope.

---

## Coverage Notes

### Per-file target: ≥ 80% on all new files

| New file | Test file | Covered paths |
|---|---|---|
| `useHorizontalDatePicker.ts` | `useHorizontalDatePicker.test.ts` | toggle, close, dateRange, entryMap, handleDateSelect (3 paths) |
| `DateCell.tsx` | `DateCell.test.tsx` | all 5 cell states + aria + click |
| `HorizontalDatePicker.tsx` | `HorizontalDatePicker.test.tsx` | render, aria, scroll |
| `Editor.tsx` delta | `Editor.test.tsx` extensions | strip toggle, date switch, mood auto-open |
| `EditorBody.tsx` delta | covered via Editor integration tests | button replacement, conditional strip |

### Stale debounce timer edge case

The technical design notes that if the 1-second autosave debounce is mid-flight when the user
taps a strip cell, `handleDateSelect` calls `saveFn` synchronously (flushing the current value
to the OLD date), and then the stale debounce fires later with the OLD `saveFn` closure — which
is idempotent (writes the same data again). This idempotency is an accepted design decision and
is NOT explicitly tested here (it would require interleaving timer and click events in
`Editor.test.tsx`). It is a **non-blocking coverage gap**, documented for future test hardening.

### `autosaveValue` staleness risk

Case H5 verifies that `saveFn` is called with the `autosaveValue` provided at hook instantiation.
It does not verify that a stale `autosaveValue` snapshot (captured in a previous render) would
cause incorrect behaviour — this is an architectural responsibility of the caller (Editor.tsx),
tested indirectly via the E2E cases.

---

## Verdict
PASS

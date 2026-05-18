# Test Plan — REQ-008: 무드 선택 바텀시트 모달

## Summary

One new test file: `src/design-system/__tests__/MoodPickerSheet.test.tsx`.
10 focused unit cases using Vitest + happy-dom + Testing Library, following the exact
same conventions as the existing `BottomSheet.test.tsx` and `useToast.test.ts` suites.
No integration tests (no backend surface). No E2E tests (full editor flow deferred to
REQ-009). No new global setup files required.

Line budget: target 95, cap 110.

---

## Framework Setup

File-level directive and imports:

```ts
// @vitest-environment happy-dom
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MOODS } from '@/design-system/moods';
import { MoodPickerSheet } from '@/design-system/MoodPickerSheet';
import type { MoodPickerSheetProps } from '@/design-system/MoodPickerSheet';
```

`beforeEach` (order matters):
1. Save originals: `origShowModal = HTMLDialogElement.prototype.showModal`, `origClose = HTMLDialogElement.prototype.close`.
2. Replace with `vi.fn()`: `showModalMock = vi.fn()`, `closeMock = vi.fn()`.
3. `HTMLDialogElement.prototype.showModal = showModalMock`, `HTMLDialogElement.prototype.close = closeMock`.
4. `vi.useFakeTimers()`.
5. `vi.clearAllMocks()`.

`afterEach` (order matters):
1. `HTMLDialogElement.prototype.showModal = origShowModal`.
2. `HTMLDialogElement.prototype.close = origClose`.
3. `vi.useRealTimers()`.
4. `cleanup()`.

Module-scope variables (declared before `beforeEach`):

```ts
let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;
```

---

## Fixtures / Mocks Needed

### `defaultProps` constant

Declared at module scope (after imports, before `describe`):

```ts
const defaultProps: MoodPickerSheetProps = {
  open: true,
  date: '2026-05-17',
  mode: 'change',
  onSelect: vi.fn(),
  onClose: vi.fn(),
};
```

`vi.clearAllMocks()` in `beforeEach` resets the stubs between cases. Tests that need
custom callbacks declare local `vi.fn()` instances and spread over `defaultProps`.

---

## Unit Tests

All 10 cases live inside `describe('MoodPickerSheet', () => { ... })`.

---

### TC-1 — `open=true` → `showModal` called; `open=false` → `close` called

```
it('open=true calls showModal')
  render(<MoodPickerSheet {...defaultProps} open={true} />)
  expect(showModalMock).toHaveBeenCalledTimes(1)
  expect(closeMock).not.toHaveBeenCalled()

it('open=false calls close')
  render(<MoodPickerSheet {...defaultProps} open={false} />)
  expect(closeMock).toHaveBeenCalledTimes(1)
  expect(showModalMock).not.toHaveBeenCalled()
```

Two separate `it` blocks within the same describe. Mirrors the BottomSheet.test.tsx
pattern exactly.

---

### TC-2 — Header: date label + title text

```
it('renders formatted date and title in header')
  render(<MoodPickerSheet {...defaultProps} date="2026-05-17" />)
  expect(screen.getByText('2026.05.17 일')).toBeTruthy()
  expect(screen.getByText('오늘은 어떤 하루였나요?')).toBeTruthy()
```

`defaultProps.date` is already `'2026-05-17'` so no override is needed; the assertion
locks the exact output of `formatSheetDate`.

---

### TC-3 — 10 mood buttons rendered

```
it('renders a button for each of the 10 moods')
  render(<MoodPickerSheet {...defaultProps} />)
  MOODS.forEach(mood => {
    expect(screen.getByRole('button', { name: mood.label })).toBeTruthy()
  })
```

Iterating `MOODS` directly means the test stays in sync automatically if the array
ever grows or the labels change.

---

### TC-4 — Mood tap → `onSelect(moodId)` then `onClose`; never `onCancelInitial`

```
it('tapping a mood calls onSelect then onClose; does not call onCancelInitial')
  const onSelect = vi.fn()
  const onClose = vi.fn()
  const onCancelInitial = vi.fn()
  render(<MoodPickerSheet
    {...defaultProps}
    mode="initial"
    onSelect={onSelect}
    onClose={onClose}
    onCancelInitial={onCancelInitial}
  />)
  fireEvent.click(screen.getByRole('button', { name: '기쁨' }))
  expect(onSelect).toHaveBeenCalledWith('joy')
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(onCancelInitial).not.toHaveBeenCalled()
  // Order guard: onSelect must be called before onClose
  expect(onSelect.mock.invocationCallOrder[0])
    .toBeLessThan(onClose.mock.invocationCallOrder[0])
```

---

### TC-5 — X button, `mode='change'` → `onClose` only

```
it('X button in change mode calls onClose once, not onCancelInitial')
  const onClose = vi.fn()
  const onCancelInitial = vi.fn()
  render(<MoodPickerSheet
    {...defaultProps}
    mode="change"
    onClose={onClose}
    onCancelInitial={onCancelInitial}
  />)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(onCancelInitial).not.toHaveBeenCalled()
```

Query the X button via `{ name: '닫기' }` — matches `IconButton`'s `aria-label="닫기"`.

---

### TC-6 — X button, `mode='initial'` → both `onCancelInitial` and `onClose`

```
it('X button in initial mode calls onCancelInitial then onClose')
  const onClose = vi.fn()
  const onCancelInitial = vi.fn()
  render(<MoodPickerSheet
    {...defaultProps}
    mode="initial"
    onClose={onClose}
    onCancelInitial={onCancelInitial}
  />)
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onCancelInitial).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
```

---

### TC-7 — `mode='change'` + X: `onCancelInitial` never called (explicit guard)

This is the complementary inverse of TC-6 and is kept as a separate `it` so
a mode-branching regression is immediately locatable. TC-5 already covers this
behavior; if the line budget is tight, TC-5 and TC-7 may be merged — but both
assertions must be present.

```
it('change mode never fires onCancelInitial regardless of close path')
  // Same body as TC-5 — acceptable to fold into TC-5 if budget tight.
```

---

### TC-8 — Inactive tab tap → `'곧 만나요!'` toast appears

`vi.useFakeTimers()` is active (from `beforeEach`), so the toast does not auto-hide
during the assertion.

```
it('tapping an inactive tab shows the 곧 만나요! toast')
  render(<MoodPickerSheet {...defaultProps} />)
  fireEvent.click(screen.getByRole('button', { name: '테마' }))
  expect(screen.getByText('곧 만나요!')).toBeTruthy()
```

Optionally assert the same for `'일상'` in the same `it` — one extra `fireEvent.click`
and one extra `expect`. Keep within budget.

---

### TC-9 — `selectedMoodId` highlights the matching cell; others plain

```
it('joy button has ring-2 and ring-peach when selectedMoodId="joy"')
  render(<MoodPickerSheet {...defaultProps} selectedMoodId="joy" />)
  const joyBtn = screen.getByRole('button', { name: '기쁨' })
  expect(joyBtn.className).toContain('ring-2')
  expect(joyBtn.className).toContain('ring-peach')
  const sadBtn = screen.getByRole('button', { name: '슬픔' })
  expect(sadBtn.className).not.toContain('ring-2')
```

---

### TC-10 — Source-guard: file contains `"use client"` directive

```
it('MoodPickerSheet.tsx has "use client" directive')
  const src = fs.readFileSync(
    path.resolve(process.cwd(), 'src/design-system/MoodPickerSheet.tsx'),
    'utf8',
  )
  expect(src).toContain('"use client"')
```

Mirrors the identical pattern in `BottomSheet.test.tsx`.

---

## Integration Tests

Not applicable. `MoodPickerSheet` has no backend surface, no API calls, no storage
access, and no routing. Callback wiring is fully verified by the unit tests above.

---

## E2E Tests

Not applicable for REQ-008. The full calendar → editor → mood-picker → body-input
flow is owned by REQ-009 and will be covered in its Playwright suite.

---

## Regression Tests

`MoodPickerSheet` is a net-new export. No existing file is modified. Running `npm test`
after adding the new file executes all prior REQ suites as a regression gate.

---

## Security-Relevant Tests

Not applicable. Pure UI boundary; no auth, no storage writes, no user data handling
beyond emitting a typed callback.

---

## Commands to Run

```bash
# 1. Typecheck first (catches import path errors, prop type mismatches)
npm run typecheck

# 2. Run only the new test file
npx vitest run src/design-system/__tests__/MoodPickerSheet.test.tsx

# 3. Full unit regression suite
npm test

# 4. Lint
npm run lint

# 5. Build (validates Next.js tree, no import issues)
npm run build
```

---

## Not Applicable Tests

| Category | Reason |
|---|---|
| Integration tests | No backend / storage / routing surface |
| E2E tests | Full editor flow is REQ-009 scope |
| Performance tests | No async ops; 10-item constant array |
| Security tests | No auth, no persistence |
| Visual regression / screenshot | No snapshot framework in project |
| Cross-browser | Chromium only; E2E deferred to REQ-009 |
| `BottomSheet` primitive contracts | Covered by existing `BottomSheet.test.tsx` |
| `Toast` / `useToast` timer behavior | Covered by existing `useToast.test.ts` |
| `MoodIcon` rendering fidelity | Covered by existing `MoodIcon.test.tsx` |

---

## Verdict
PASS

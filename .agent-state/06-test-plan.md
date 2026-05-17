# Test Plan — REQ-005

## Summary

Eight test files covering 9 design-system primitives (Card, EmptyState, IconButton, FAB, useDialogControl, BottomSheet, ConfirmDialog, Toast, useToast). Total ~51 `it()` cases. Every Caller Invariant from the API contract is mapped to at least one test. Source-guard tests verify the `"use client"` boundary is correct for each file — present for client components, absent for server components.

---

## Runtime & Config

- **Vitest global env:** `node` (project default per `vitest.config.ts`).
- **Per-file env override:** `// @vitest-environment happy-dom` at the top of every test file.
- **DOM library:** `@testing-library/react` (`render`, `screen`, `fireEvent`, `cleanup`) plus `renderHook` for hook tests.
- **Teardown:** `afterEach(cleanup)` declared in each file (same pattern as MoodIcon.test.tsx).
- **Dialog stubs:** `HTMLDialogElement.prototype.showModal` and `HTMLDialogElement.prototype.close` assigned as `vi.fn()` in `beforeEach` in every file that mounts a `<dialog>` (useDialogControl, BottomSheet, ConfirmDialog). Restore originals in `afterEach`.
- **Timer faking:** `vi.useFakeTimers()` in `beforeEach` / `vi.useRealTimers()` in `afterEach` in `useToast.test.ts` only.
- **Source-guard reads:** `node:fs` / `node:path` + `process.cwd()` — same pattern as `MoodIcon.test.tsx`.
- **Import alias:** `@/design-system/<Name>` per-file, no barrel.

---

## Unit Tests

### Card.test.tsx (5 cases, happy-dom)

1. **renders children** — render `<Card><span data-testid="child" /></Card>`; `screen.getByTestId('child')` exists.
2. **boxShadow token** — query root element `style.boxShadow`; assert equals `'var(--shadow-card)'`.
3. **radius tokens** — default: root element `className` references `--radius-card`; `large={true}` switches to `--radius-card-lg`. Verified by inspecting `className` string for the relevant CSS variable name.
4. **className merged** — pass `className="extra-class"`; root element has `extra-class` in its `classList`.
5. **source-guard: no `"use client"`** — `fs.readFileSync('src/design-system/Card.tsx', 'utf8')` does NOT contain `'"use client"'`.

---

### EmptyState.test.tsx (7 cases, happy-dom)

1. **renders all 4 slots** — pass `icon`, `title`, `description`, and `action`; assert all four are present in the rendered output.
2. **omits absent optional slots** — render with only `title`; assert icon container, description text, and action wrapper are absent (`queryBy*` returns null).
3. **string title wrapped in `<p>`** — pass `title="빈 목록"` (string); assert the text is inside a `<p>` element.
4. **ReactNode title rendered as-is** — pass `title={<h2>제목</h2>}`; assert an `<h2>` is in the DOM with no intermediate `<p>` wrapper.
5. **className merged** — pass `className="my-layout"`; root `<div>` has `my-layout` in its `classList`.
6. **description text present** — pass `description="설명입니다"`; `screen.getByText('설명입니다')` found.
7. **source-guard: no `"use client"`** — `fs.readFileSync('src/design-system/EmptyState.tsx', 'utf8')` does NOT contain `'"use client"'`.

---

### IconButton.test.tsx (6 cases, happy-dom)

1. **renders `<button type="button">` with correct aria-label** — `screen.getByRole('button', { name: '닫기' })` resolves; attribute `type` is `'button'`.
2. **touch-target dimensions** — `element.style.width === '44px'` and `element.style.height === '44px'`.
3. **onClick fires on click** — `fireEvent.click(button)`; `onClick` spy called exactly once.
4. **disabled prevents onClick** — `disabled={true}`: `fireEvent.click(button)`; `onClick` spy NOT called.
5. **disabled adds opacity and cursor classes** — disabled button has `opacity-40` and `cursor-not-allowed` in `className`.
6. **source-guard: has `"use client"`** — `fs.readFileSync('src/design-system/IconButton.tsx', 'utf8')` CONTAINS `'"use client"'`.

---

### FAB.test.tsx (5 cases, happy-dom)

1. **renders `<button type="button">` with aria-label** — `screen.getByRole('button', { name: '새 일기 작성' })` resolves; `type === 'button'`.
2. **touch-target dimensions** — `element.style.width === '56px'` and `element.style.height === '56px'`.
3. **onClick fires on click** — `fireEvent.click(button)`; spy called exactly once.
4. **default fixed positioning and charcoal background** — button `className` contains `fixed`, `bottom-6`, `right-6`, and `bg-charcoal`.
5. **source-guard: has `"use client"`** — `fs.readFileSync('src/design-system/FAB.tsx', 'utf8')` CONTAINS `'"use client"'`.

---

### useDialogControl.test.ts (5 cases, happy-dom)

Setup: in `beforeEach`, assign `HTMLDialogElement.prototype.showModal = vi.fn()` and `HTMLDialogElement.prototype.close = vi.fn()`. Restore originals in `afterEach`. Use a minimal wrapper component that calls `useDialogControl(open, onClose)` and attaches the returned `ref` to a rendered `<dialog>`.

1. **open=true calls showModal once** — render wrapper with `open={true}`; after effects flush, `showModal` spy has been called once.
2. **open=false calls close once** — mount with `open={true}` then `rerender` with `open={false}`; `close` spy called once.
3. **toggling true→false→true calls showModal twice** — `rerender` to false then back to true; `showModal` call count is 2.
4. **onDialogClick with matching target calls onClose** — call the returned `onDialogClick` with a synthetic event where `e.target === ref.current` (the dialog element itself); `onClose` spy called once.
5. **onDialogClick with non-matching target does NOT call onClose** — call `onDialogClick` with `e.target` set to a child `<div>` (different from `ref.current`); `onClose` spy NOT called.

---

### BottomSheet.test.tsx (6 cases, happy-dom)

Setup: same `HTMLDialogElement.prototype` stubs as useDialogControl tests.

1. **open=true invokes showModal** — mount `<BottomSheet open={true} onClose={vi.fn()}>…</BottomSheet>`; after effects, `showModal` stub called once.
2. **open=false invokes close** — mount with `open={false}`; `close` stub called once.
3. **grip handle rendered** — DOM contains an element matching the grip handle classes `w-10 h-1 rounded-full`; element is present regardless of open state (always mounted).
4. **backdrop click fires onClose** — obtain dialog element reference; `fireEvent.click(dialogEl)` constructing the event so `target` equals the dialog element itself; `onClose` spy called.
5. **children rendered inside dialog** — pass `<span data-testid="bs-child" />`; `screen.getByTestId('bs-child')` present.
6. **source-guard: has `"use client"`** — `fs.readFileSync('src/design-system/BottomSheet.tsx', 'utf8')` CONTAINS `'"use client"'`.

---

### ConfirmDialog.test.tsx (8 cases, happy-dom)

Setup: same dialog stubs.

1. **renders message text** — `screen.getByText('정말 삭제할까요?')` found after render.
2. **default Korean labels and button height** — buttons with accessible name `'확인'` and `'취소'` both exist; each has `min-h-[44px]` or equivalent in `className`.
3. **custom labels override defaults** — pass `confirmLabel="삭제"` and `cancelLabel="돌아가기"`; buttons `'삭제'` and `'돌아가기'` found; `'확인'` and `'취소'` absent.
4. **confirm click fires onConfirm only** — `fireEvent.click(confirmButton)`; `onConfirm` spy called once; `onCancel` NOT called.
5. **cancel click fires onCancel only** — `fireEvent.click(cancelButton)`; `onCancel` spy called once; `onConfirm` NOT called.
6. **backdrop click fires onCancel** — `fireEvent.click(dialogEl)` with target set to dialog element; `onCancel` spy called.
7. **destructive=true applies danger styling** — confirm button has `bg-danger` in `className` (or inline `backgroundColor` equals `var(--color-danger)`); `bg-charcoal` is absent from confirm button.
8. **source-guard: has `"use client"`** — `fs.readFileSync('src/design-system/ConfirmDialog.tsx', 'utf8')` CONTAINS `'"use client"'`.

---

### Toast.test.tsx (5 cases, happy-dom)

1. **renders element when open=true** — `screen.getByRole('status')` found after render with `open={true} message="저장됨"`.
2. **nothing rendered when open=false** — `screen.queryByRole('status')` returns null with `open={false}`.
3. **default role is "status"** — rendered element's `role` attribute equals `'status'` (no explicit `role` prop passed).
4. **role="alert" opt-in** — pass `role="alert"`; `screen.getByRole('alert')` resolves; `screen.queryByRole('status')` is null.
5. **source-guard: has `"use client"`** — `fs.readFileSync('src/design-system/Toast.tsx', 'utf8')` CONTAINS `'"use client"'`.

---

### useToast.test.ts (5 cases, happy-dom)

Setup: `vi.useFakeTimers()` in `beforeEach`; `vi.useRealTimers()` in `afterEach`. Use `renderHook` from `@testing-library/react`.

1. **initial state** — `result.current.open === false` and `result.current.message === ''`.
2. **show sets open and message** — `act(() => result.current.show('저장됨'))`; assert `open === true` and `message === '저장됨'`.
3. **auto-hides after default duration** — after `show()`, `act(() => vi.advanceTimersByTime(1800))`; assert `open === false`.
4. **re-calling show before timer expires resets timer** — call `show('첫 번째')`, advance 900ms (still open), call `show('두 번째')`, advance 900ms more (still open — prior timer was cleared), advance final 900ms (total 1800ms from second call); assert `open === false`.
5. **hide() immediately closes** — call `show('테스트')`, then `act(() => result.current.hide())`; `open === false`; advance full 1800ms — no error thrown (cleared timer fires nothing).

---

## Integration Tests

Not applicable for this REQ. All primitives are self-contained React components and hooks with no network calls, no `localStorage` access, and no cross-module side effects. Component composition (e.g., BottomSheet consuming useDialogControl) is covered within the component's own unit test file.

---

## E2E Tests

Not applicable. No screen-level user journey is delivered in REQ-005. First E2E coverage deferred to REQ-007 (calendar screen). Escape-key native dialog close behavior (which happy-dom does not simulate) is also deferred to that phase.

---

## Regression Tests

- Existing `MoodIcon.test.tsx`, `moods.test.ts`, and `personas.test.ts` suites must continue to pass after REQ-005 files are added. Running `npx vitest run` exercises all suites together.
- `src/app/globals.css` receives two additive token lines and one CSS rule block. No existing selector is removed or renamed. `npm run build` is the regression check for this file.

---

## Security-Relevant Tests

No security-sensitive logic in these primitives (no auth, no storage, no network). The source-guard tests (cases verifying `"use client"` presence/absence) prevent accidental server-side execution of client-only hooks (`useState`, `useEffect`, `useRef`) which would cause runtime errors in Next.js server components — a correctness boundary rather than a security one.

---

## Fixtures / Mocks Needed

- **`HTMLDialogElement.prototype.showModal`** — `vi.fn()` stub; required in useDialogControl.test.ts, BottomSheet.test.tsx, ConfirmDialog.test.tsx. happy-dom does not implement `showModal`.
- **`HTMLDialogElement.prototype.close`** — same.
- **`vi.useFakeTimers()`** — useToast.test.ts only.
- **No MSW, no network mocks, no localStorage setup** — primitives have no I/O.
- **`node:fs` / `node:path`** — source-guard reads; available in happy-dom env (Node.js runtime).

---

## Commands to Run

```bash
# Run only the 8 new REQ-005 test files
npx vitest run src/design-system/__tests__/Card.test.tsx \
  src/design-system/__tests__/EmptyState.test.tsx \
  src/design-system/__tests__/IconButton.test.tsx \
  src/design-system/__tests__/FAB.test.tsx \
  src/design-system/__tests__/useDialogControl.test.ts \
  src/design-system/__tests__/BottomSheet.test.tsx \
  src/design-system/__tests__/ConfirmDialog.test.tsx \
  src/design-system/__tests__/Toast.test.tsx \
  src/design-system/__tests__/useToast.test.ts

# Run all design-system tests (includes MoodIcon, moods, personas)
npx vitest run src/design-system/__tests__/

# Full test suite
npx vitest run

# Type-check (ensure test files compile alongside source)
npx tsc --noEmit

# Build check (verifies globals.css token additions don't break Tailwind)
npm run build
```

---

## Coverage Matrix

Mapping every Caller Invariant and Edge Contract from `04-api-contract.md`:

| Invariant / Edge | Covering Test(s) |
|---|---|
| Shadow MUST be `var(--shadow-card)` inline style on Card | Card case 2 |
| Card `className` appended after internal classes | Card case 4 |
| No `"use client"` in Card | Card case 5 |
| No `"use client"` in EmptyState | EmptyState case 7 |
| EmptyState string `title` wrapped in `<p>` | EmptyState case 3 |
| EmptyState ReactNode `title` rendered as-is | EmptyState case 4 |
| EmptyState optional slots absent when not provided | EmptyState case 2 |
| IconButton touch target 44×44 always (not overridable by className) | IconButton case 2 |
| IconButton `aria-label === label` | IconButton case 1 |
| IconButton `disabled=true` — onClick not fired | IconButton case 4 |
| IconButton `disabled=true` — `opacity-40 cursor-not-allowed` classes | IconButton case 5 |
| `"use client"` in IconButton | IconButton case 6 |
| FAB touch target 56×56 | FAB case 2 |
| FAB default `fixed bottom-6 right-6 bg-charcoal` | FAB case 4 |
| `"use client"` in FAB | FAB case 5 |
| useDialogControl `open=true` → `showModal()` called | useDialogControl case 1 |
| useDialogControl `open=false` → `close()` called | useDialogControl case 2 |
| useDialogControl rapid toggle null-guard | useDialogControl case 3 |
| useDialogControl `onDialogClick` matching target → `onClose` | useDialogControl case 4 |
| useDialogControl `onDialogClick` non-matching target → no `onClose` | useDialogControl case 5 |
| BottomSheet always mounted (never conditionally unmounted) | BottomSheet case 3 (grip present when open=false) |
| BottomSheet backdrop click → `onClose` | BottomSheet case 4 |
| `"use client"` in BottomSheet | BottomSheet case 6 |
| ConfirmDialog default labels Korean `'확인'`/`'취소'` | ConfirmDialog case 2 |
| ConfirmDialog both buttons ≥ 44px height | ConfirmDialog case 2 (min-h class assertion) |
| ConfirmDialog backdrop click → `onCancel` | ConfirmDialog case 6 |
| ConfirmDialog `destructive=true` → `bg-danger` on confirm button | ConfirmDialog case 7 |
| ConfirmDialog never closes itself (caller owns open state) | ConfirmDialog cases 4, 5 (onConfirm/onCancel fired; open not checked internally) |
| `"use client"` in ConfirmDialog | ConfirmDialog case 8 |
| Toast renders only when `open=true` | Toast cases 1, 2 |
| Toast default `role="status"` | Toast case 3 |
| Toast `role="alert"` opt-in | Toast case 4 |
| `"use client"` in Toast | Toast case 5 |
| useToast initial state open=false, message='' | useToast case 1 |
| useToast `show()` → open=true + message set | useToast case 2 |
| useToast auto-hides after default 1800ms | useToast case 3 |
| useToast `show()` mid-timer clears prior timer | useToast case 4 |
| useToast `hide()` immediately closes | useToast case 5 |

---

## Not Applicable Tests

| Category | Reason |
|---|---|
| Visual regression / screenshots | No Playwright or Storybook snapshot framework installed |
| Browser E2E | Deferred to REQ-007; happy-dom covers DOM behavior for atoms |
| CSS specificity / Tailwind purging | Build step (`npm run build`) is the gate; not a Vitest concern |
| Animation timing precision | happy-dom does not compute CSS transitions; slide-up verified via `data-open` attribute only |
| Escape key native dialog close | happy-dom does not dispatch native dialog `close` events from Escape; covered structurally by useDialogControl hook tests |
| SSR rendering of server components | Next.js SSR env not available in Vitest; `useEffect` guard is structural |
| Toast z-index above `showModal` top layer | Cannot be asserted in unit tests; documented constraint in component JSDoc |

---

## Verdict
PASS

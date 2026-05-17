# Technical Design — REQ-005

## Goal

Produce seven reusable design-system primitives for 딸깍일기. Every subsequent screen REQ composes from these atoms. All primitives live in `src/design-system/`, consume only `globals.css @theme` tokens, hold to ≤ 100 lines per file, and ship with matching Vitest specs.

---

## Resolved Unknowns

**1. `--color-danger` exact value: `#C53030`**

Contrast ratios against `#FFFFFF` (background of confirm button):

| Candidate | Ratio | WCAG AA 4.5:1 normal |
|---|---|---|
| `#E05C5C` (architecture pick) | ~3.8:1 | FAIL |
| `#D32F2F` | ~4.4:1 | Borderline FAIL |
| `#C53030` | ~5.4:1 | PASS |
| `#B91C1C` | ~6.3:1 | PASS, too dark for pastel palette |

`#C53030` passes WCAG AA at 14px button text, harmonizes with desaturated mood palette, sits between `--color-mood-angry: #F4A6A6` and full crimson. Selected.

**2. Toast z-index vs `<dialog>` top layer**

`showModal()` places `<dialog>` in the browser top layer — above any z-index. A `position: fixed` div Toast cannot exceed it.

Strategy: Toast is non-modal status indicator for non-modal contexts (entry saved, action confirmed). PRD shows no scenario where a toast fires inside a BottomSheet/ConfirmDialog. Document constraint in `Toast.tsx` JSDoc. Future: if a REQ needs toast-from-modal, render the `<div>` inside the `<dialog>` DOM subtree as a child.

**3. `EmptyState.title` type: `ReactNode`**

`title: ReactNode` lets callers pass `<h2>`, `<p>`, or string without API change. String value wrapped in `<p className="text-lg text-charcoal font-medium">`; ReactNode rendered as-is. Implemented with `typeof title === 'string'` branch.

---

## File Layout (with line budgets)

```
src/app/globals.css                          existing — additive (~+6 lines)

src/design-system/
  Card.tsx                                   server   ≤ 45 lines
  EmptyState.tsx                             server   ≤ 70 lines
  IconButton.tsx                             client   ≤ 55 lines
  FAB.tsx                                    client   ≤ 55 lines
  useDialogControl.ts                        client   ≤ 40 lines  (shared hook)
  BottomSheet.tsx                            client   ≤ 85 lines
  ConfirmDialog.tsx                          client   ≤ 90 lines
  Toast.tsx                                  client   ≤ 60 lines
  useToast.ts                                client   ≤ 35 lines

src/design-system/__tests__/
  Card.test.tsx                              ≤ 60 lines
  EmptyState.test.tsx                        ≤ 70 lines
  IconButton.test.tsx                        ≤ 60 lines
  FAB.test.tsx                               ≤ 60 lines
  BottomSheet.test.tsx                       ≤ 80 lines
  ConfirmDialog.test.tsx                     ≤ 80 lines
  Toast.test.tsx                             ≤ 70 lines
  useToast.test.ts                           ≤ 50 lines
```

`useDialogControl.ts` is extracted preemptively because both BottomSheet and ConfirmDialog share the same `useEffect` + ref + backdrop-click logic.

---

## New Tokens in `globals.css`

Add inside the existing `@theme { }` block after `--radius-*`:

```css
/* Shadows — PRD §1.6.6 */
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04);

/* Semantic colors — PRD §5.4 */
--color-danger: #C53030;
```

**Shadow consumption pattern (locked):** Tailwind 4 does NOT auto-generate `shadow-*` utilities from `@theme --shadow-*`. Components needing `--shadow-card` use inline `style={{ boxShadow: 'var(--shadow-card)' }}`. The arbitrary-class `[box-shadow:var(--shadow-card)]` is also acceptable but inline style preferred (more legible diffs, explicit test assertions).

---

## CSS Rule for `dialog::backdrop`

Add to `globals.css` after `html, body` block (outside `@theme`):

```css
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.4);
}
```

Cannot be Tailwind utility; lives in global stylesheet.

---

## Component-by-Component

### 1. Card — server
- Directive: none
- Root: `<div>`
- ARIA: none
- Props: `{ children: ReactNode; className?: string; large?: boolean }`
- Token usage: `bg-paper`, `rounded-[var(--radius-card)]` (or large `--radius-card-lg`), `style={{ boxShadow: 'var(--shadow-card)' }}`

### 2. EmptyState — server
- Directive: none
- Root: `<div>`
- Props: `{ icon?: ReactNode; title: ReactNode; description?: string; action?: ReactNode; className?: string }`
- Title rendering: `if (typeof title === 'string')` wrap in `<p className="text-lg font-medium text-charcoal">`, else render as-is
- `action` slot is caller's responsibility for touch-target

### 3. IconButton — client
- Directive: `"use client"`
- Root: `<button type="button">`
- ARIA: `aria-label` REQUIRED (Korean, caller-supplied)
- Props: `{ icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; className?: string }`
- 44×44 inline style; icon slot 24×24 (caller sizes)
- Token: `bg-paper`, `rounded-full`; disabled: `opacity-40 cursor-not-allowed`

### 4. FAB — client
- Directive: `"use client"`
- Root: `<button type="button">`
- Props: `{ icon: ReactNode; label: string; onClick: () => void; className?: string }`
- 56×56 inline style; `bg-charcoal text-paper rounded-full fixed bottom-6 right-6`
- Caller can override fixed positioning via `className` if needed

### 5. `useDialogControl` hook — client
- Location: `src/design-system/useDialogControl.ts`
- Signature: `function useDialogControl(open: boolean, onClose: () => void): { ref: RefObject<HTMLDialogElement | null>; onDialogClick: (e: React.MouseEvent<HTMLDialogElement>) => void }`
- `useEffect([open])`: when true → `ref.current?.showModal()`; when false → `ref.current?.close()`
- `onDialogClick`: if `e.target === ref.current`, call `onClose()` (backdrop click detection)
- `showModal()` called inside `useEffect` (not render) to satisfy React rules + avoid SSR mismatch

### 6. BottomSheet — client
- Directive: `"use client"`
- Root: `<dialog>` via `useDialogControl`
- ARIA: native `<dialog>` with `showModal()` provides `role="dialog"` + `aria-modal="true"`
- Props: `{ open: boolean; onClose: () => void; children: ReactNode; className?: string }`
- Token: `bg-paper`, top-radius `style={{ borderRadius: '24px 24px 0 0' }}`, grip handle `<div className="bg-meta w-10 h-1 rounded-full mx-auto mb-4">`
- Slide-up: plain CSS transition `translate(0, 100%)` → `translate(0, 0)` toggled by `data-open` attribute
- `<dialog>` always mounted (kept in DOM); CSS class toggles visual state

### 7. Toast — client
- Directive: `"use client"`
- Root: `<div role="status">` (or `"alert"` if caller opts in)
- Props: `{ message: string; open: boolean; onClose: () => void; role?: 'status' | 'alert'; durationMs?: number; className?: string }`
- Default `durationMs`: 1800
- Token: `bg-charcoal text-paper rounded-full fixed bottom-24 px-6 py-3 text-sm`
- Pure controlled component; auto-dismiss handled by `useToast` hook (separated)

### `useToast` hook — client
- Location: `src/design-system/useToast.ts`
- Returns: `{ message: string; open: boolean; show: (message: string, durationMs?: number) => void; hide: () => void }`
- `show()` sets state + schedules `setTimeout(hide, durationMs)`
- Effect cleans up timeout on unmount / re-call before timer fires

### 8. ConfirmDialog — client
- Directive: `"use client"`
- Root: `<dialog>` via `useDialogControl`
- ARIA: `aria-labelledby` pointing to message `<p>`
- Props:
```ts
{
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;       // default '확인'
  cancelLabel?: string;        // default '취소'
  destructive?: boolean;       // default false
  className?: string;
}
```
- Token: `bg-paper`, `rounded-[var(--radius-card-lg)]` (20px), `style={{ boxShadow: 'var(--shadow-card)' }}`; confirm button bg: `destructive ? 'bg-danger text-paper' : 'bg-charcoal text-paper'`
- Buttons min 44px height (`min-h-[44px]` or `py-3`)
- Backdrop click → `onCancel` (via `useDialogControl.onDialogClick`)
- Controlled: never closes itself; caller flips `open` after `onConfirm`/`onCancel`

---

## Implementation Order

1. **`globals.css`** — add 2 tokens + `dialog::backdrop` rule. Run `npm run build` to verify.
2. **`Card.tsx`** — simplest server primitive; establishes `boxShadow: 'var(--shadow-card)'` pattern.
3. **`EmptyState.tsx`** — second server primitive; establishes ReactNode title pattern.
4. **`IconButton.tsx`** — leaf client primitive; establishes `"use client"` + required `aria-label`.
5. **`FAB.tsx`** — leaf client primitive; fixed positioning.
6. **`useDialogControl.ts`** — shared hook; unit-testable.
7. **`BottomSheet.tsx`** — composite client; consumes `useDialogControl`.
8. **`ConfirmDialog.tsx`** — composite client; consumes `useDialogControl`.
9. **`Toast.tsx` + `useToast.ts`** — client pair; independent of dialog.
10. **Tests** — written after sources stable.

---

## Test Design Sketch (handover to test-engineer)

All test files: `// @vitest-environment happy-dom`; `afterEach(cleanup)`.

**Card**: renders children in `<div>`; `boxShadow` style equals `var(--shadow-card)`; `className` on root; source-guard no `"use client"`.

**EmptyState**: renders icon/title/description/action; string title wrapped in `<p>`; ReactNode title rendered as-is; source-guard no `"use client"`.

**IconButton**: `<button type="button">`; `aria-label === label`; width/height = 44; `onClick` fires on click; source-guard has `"use client"`.

**FAB**: same structure as IconButton; width/height = 56; source-guard has `"use client"`.

**useDialogControl**: mock `HTMLDialogElement.prototype.showModal/close`; on `open=true` mock called once; on `false` close mock called once; `onDialogClick` with matching `e.target` calls `onClose`; mismatched target does not.

**BottomSheet**: `open=true` → `open` attribute present; grip handle rendered; `onClose` fires on backdrop click; source-guard has `"use client"`.

**ConfirmDialog**: renders `message`; default `confirmLabel='확인'`/`cancelLabel='취소'`; `onConfirm`/`onCancel` fire on respective clicks; `destructive=true` applies `bg-danger` class; backdrop click → `onCancel`; source-guard has `"use client"`.

**Toast**: renders when `open=true`, absent when `open=false`; `role="status"` default; `role="alert"` opt-in; source-guard has `"use client"`.

**useToast**: `vi.useFakeTimers()`; `show('msg', 1800)` → `open=true`; advance 1800ms → `open=false`; `hide()` immediate; timer cleared on re-call.

---

## Risks

1. **Prop-signature lock-in.** REQ-007+ will import. Designs intentionally conservative. Add props only when a consuming REQ explicitly needs them.
2. **`bg-danger` utility availability.** Tailwind 4 should auto-generate from `@theme --color-danger`. Verify in step-1 build. Fallback: `style={{ backgroundColor: 'var(--color-danger)' }}`.
3. **`<dialog>` ref wiring under React 19.** New `ref` prop (no `forwardRef`). `useRef<HTMLDialogElement>` directly as `ref={ref}` should compile. Verify.
4. **happy-dom `showModal()` stub.** Mock `HTMLDialogElement.prototype.showModal/close` in tests before asserting calls.
5. **BottomSheet animation timing.** Keep `<dialog>` always mounted; toggle visual state via CSS class on `data-open`. Conditional `open && <dialog>` would break slide animation.

---

## Verdict
PASS

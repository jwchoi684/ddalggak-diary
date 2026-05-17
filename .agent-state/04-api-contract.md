# API Contract — REQ-005

## Scope

Internal TypeScript module contract for 9 new files under `src/design-system/`. All boundaries are intra-frontend function signatures, prop interfaces, and hook return shapes. No HTTP endpoints, no backend, no storage keys change.

---

## Public Exports per File

| File | Export | Kind |
|---|---|---|
| `Card.tsx` | `Card` | `function` (Server Component) |
| `EmptyState.tsx` | `EmptyState` | `function` (Server Component) |
| `IconButton.tsx` | `IconButton` | `function` (Client Component) |
| `FAB.tsx` | `FAB` | `function` (Client Component) |
| `BottomSheet.tsx` | `BottomSheet` | `function` (Client Component) |
| `Toast.tsx` | `Toast` | `function` (Client Component) |
| `ConfirmDialog.tsx` | `ConfirmDialog` | `function` (Client Component) |
| `useDialogControl.ts` | `useDialogControl` | `function` (Client Hook) |
| `useToast.ts` | `useToast` | `function` (Client Hook) |

All exports named. No default exports. No barrel `index.ts`.

---

## Per-Component Detail

### Card — Server Component

```ts
interface CardProps {
  children: ReactNode;
  className?: string;
  large?: boolean;  // true → --radius-card-lg (20px); default 16px
}
function Card(props: CardProps): JSX.Element
```

**Behavior.** `<div>` with `bg-paper`, border-radius from `--radius-card` (or large), `style={{ boxShadow: 'var(--shadow-card)' }}`. No interactive elements; no listeners.

**Invariants.** No `"use client"`. Shadow MUST be `var(--shadow-card)` via inline `style`. `className` appended after internal classes.

---

### EmptyState — Server Component

```ts
interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;            // string → wrapped in <p>; ReactNode → as-is
  description?: string;
  action?: ReactNode;          // touch target = caller's responsibility
  className?: string;
}
function EmptyState(props: EmptyStateProps): JSX.Element
```

**Behavior.** Centered column: icon → title → description → action. `typeof title === 'string'` branch wraps in `<p className="text-lg font-medium text-charcoal">`; else renders ReactNode directly.

**Invariants.** No `"use client"`. `action` slot's touch-target burden is on caller.

---

### IconButton — Client Component

```ts
interface IconButtonProps {
  icon: ReactNode;
  label: string;              // Korean aria-label; required
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}
function IconButton(props: IconButtonProps): JSX.Element
```

**Behavior.** `<button type="button" aria-label={label}>` at exactly 44×44 via `style={{ width: 44, height: 44 }}`. Surface `bg-paper rounded-full`. Disabled: `opacity-40 cursor-not-allowed`; `onClick` not fired when disabled.

**Invariants.** `label` non-empty Korean. Touch target 44×44 always. `"use client"` present.

---

### FAB — Client Component

```ts
interface FABProps {
  icon: ReactNode;
  label: string;              // Korean aria-label; required
  onClick: () => void;
  className?: string;
}
function FAB(props: FABProps): JSX.Element
```

**Behavior.** `<button type="button" aria-label={label}>` at exactly 56×56 via inline style. Default: `bg-charcoal text-paper rounded-full fixed bottom-6 right-6`. Caller may override `fixed` via `className`.

**Invariants.** Touch target 56×56. `"use client"` present.

---

### useDialogControl — Client Hook

```ts
interface DialogControlResult {
  ref: RefObject<HTMLDialogElement | null>;
  onDialogClick: (e: React.MouseEvent<HTMLDialogElement>) => void;
}
function useDialogControl(open: boolean, onClose: () => void): DialogControlResult
```

**Behavior.**
- `useEffect([open])`: `open=true` → `ref.current?.showModal()`; `false` → `ref.current?.close()`.
- `showModal()`/`close()` called inside `useEffect`, never at render.
- `onDialogClick(e)`: if `e.target === ref.current`, calls `onClose()`. Interior clicks don't bubble to `<dialog>` as target — only backdrop clicks trigger close.

**Invariants.** Must be used in `"use client"` file. Caller passes `ref` to `<dialog ref={ref}>`. Caller responsible for flipping `open=false` in their `onClose` handler.

---

### BottomSheet — Client Component

```ts
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}
function BottomSheet(props: BottomSheetProps): JSX.Element
```

**Behavior.** `<dialog>` via `useDialogControl`. **Always mounted in DOM** (never conditionally rendered); slide-up via CSS `translate(0, 100%) → translate(0, 0)` toggled by `data-open` attribute. Top radius `style={{ borderRadius: '24px 24px 0 0' }}`. Grip handle: `<div className="bg-meta w-10 h-1 rounded-full mx-auto mb-4">`. `showModal()` provides native focus trap + Escape key close.

**Invariants.** Native `<dialog>` provides `role="dialog"` + `aria-modal="true"`. Escape key fires native `close` → caller's `onClose` via `useDialogControl`. Never conditionally unmount — breaks slide-out animation.

---

### Toast — Client Component

```ts
interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  role?: 'status' | 'alert';   // default 'status'
  durationMs?: number;          // informational; default 1800
  className?: string;
}
function Toast(props: ToastProps): JSX.Element
```

**Behavior.** Renders `<div role={role}>` only when `open === true`. Fixed pill: `bg-charcoal text-paper rounded-full fixed bottom-24 px-6 py-3 text-sm`. **Pure controlled component**; auto-dismiss is caller's responsibility (typically `useToast`).

**Invariants.** `durationMs` informational only; timer logic in `useToast`. Toast does NOT appear above `showModal()` top layer — render inside `<dialog>` DOM subtree if needed inside modal.

---

### ConfirmDialog — Client Component

```ts
interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;        // caller must flip open=false
  onCancel: () => void;          // caller must flip open=false
  confirmLabel?: string;         // default '확인'
  cancelLabel?: string;          // default '취소'
  destructive?: boolean;         // default false → bg-charcoal; true → bg-danger
  className?: string;
}
function ConfirmDialog(props: ConfirmDialogProps): JSX.Element
```

**Behavior.** `<dialog>` via `useDialogControl`. Layout: `bg-paper rounded-[var(--radius-card-lg)]` with `style={{ boxShadow: 'var(--shadow-card)' }}`. `aria-labelledby` → message `<p>`. Confirm: `destructive ? 'bg-danger text-paper' : 'bg-charcoal text-paper'`, `min-h-[44px]`. Cancel: outlined/muted, `min-h-[44px]`. Backdrop click → `onCancel`. Component never closes itself — caller owns `open` state.

**Invariants.** Both buttons ≥ 44px height. `destructive` defaults false; opt-in. Default labels Korean `'확인'`/`'취소'`.

---

### useToast — Client Hook

```ts
interface ToastState {
  message: string;
  open: boolean;
  show: (message: string, durationMs?: number) => void;
  hide: () => void;
}
function useToast(): ToastState
```

**Behavior.** `useState` for `{ message, open }`. `show()` sets `open=true` + `message`, clears any existing timeout, schedules `setTimeout(hide, durationMs ?? 1800)`. `hide()` sets `open=false`. Cleanup on unmount clears pending timer. No global singleton; isolated state per call site.

**Invariants.** Spread `useToast()` return onto `<Toast message={message} open={open} onClose={hide} />`. `durationMs` to `show()` overrides default per invocation.

---

## Caller Invariants (Cross-Cutting)

1. **Token-only styling.** Colors, radii, shadows from `globals.css @theme`. No hex literals in component files.
2. **Touch targets.** Enforced via inline `style` or Tailwind constraint — not overridable by `className`.
3. **`className` is layout-only.** Margin, flex, z-index. Interior surface remains under primitive control.
4. **No barrel.** Per-file imports.
5. **Server/Client boundary.** `Card` and `EmptyState` safe in Server Components. Others require client boundary at or above the import site.

---

## Error / Edge Contract Summary

| Primitive | Edge | Contract |
|---|---|---|
| `IconButton` | `disabled=true` | `onClick` not fired; visual `opacity-40`. |
| `ConfirmDialog` | backdrop click | Routes to `onCancel`. |
| `BottomSheet` | Escape key | Native `<dialog>` `close` event → `onClose`. |
| `Toast` | `show()` mid-timer | Prior timer cleared; new starts from 0. |
| `Toast` inside `<dialog>` | z-index below top layer | Render inside dialog DOM subtree. |
| `EmptyState` | `title` ReactNode | As-is; string wraps in styled `<p>`. |
| `useDialogControl` | rapid `open` toggle | `showModal`/`close` guarded by ref null-check. |

---

## Backward Compatibility

New files with no prior consumers. Prop shapes additive by design — future REQs may add optional props only. `src/app/globals.css` is the only existing file changed (additive: 2 tokens + 1 CSS rule block).

---

## Import Path Discipline

```ts
import { Card }          from '@/design-system/Card'
import { EmptyState }    from '@/design-system/EmptyState'
import { IconButton }    from '@/design-system/IconButton'
import { FAB }           from '@/design-system/FAB'
import { BottomSheet }   from '@/design-system/BottomSheet'
import { Toast }         from '@/design-system/Toast'
import { ConfirmDialog } from '@/design-system/ConfirmDialog'
import { useDialogControl } from '@/design-system/useDialogControl'
import { useToast }      from '@/design-system/useToast'
```

No barrel `index.ts`.

---

## Out of Scope

- `Header` composite (REQ-007).
- Mood-tinted card variants (REQ-014).
- Calendar day cell, mood emoji tile (REQ-007).
- Chat bubbles, cited-diary chips, persona avatar pill (REQ-015/017).
- Dark mode (P1).
- Screen-level transition system (REQ-006).
- Storybook / demo page.

---

## Verdict
PASS

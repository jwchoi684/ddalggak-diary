# Code Review — REQ-005

## Verdict
PASS

---

## Contract Conformance

**Card** — Fully conformant. `CardProps` matches contract (`children`, `className?`, `large?`). Shadow via inline `style={{ boxShadow: 'var(--shadow-card)' }}`. Radius via CSS-variable Tailwind classes. No `"use client"`. JSDoc present.

**EmptyState** — Fully conformant. All 5 props match types and optionality. String title wrapped in `<p className="text-lg font-medium text-charcoal">`; ReactNode title rendered as-is. No `"use client"`.

**IconButton** — Fully conformant. Touch target enforced via `style={{ width: 44, height: 44 }}`. Disabled path correctly nulls `onClick`. `aria-label={label}`, `type="button"`. `"use client"` present.

**FAB** — Fully conformant. 56×56 inline style. Default classes `bg-charcoal text-paper rounded-full fixed bottom-6 right-6` all present. `type="button"`, `aria-label={label}`. `"use client"` present.

**useDialogControl** — Fully conformant. `DialogControlResult` interface matches contract. `showModal()`/`close()` inside `useEffect([open])`. Backdrop detection via `e.target === ref.current`. Optional chaining null guard. `"use client"` present.

**BottomSheet** — Fully conformant. Always mounted. Top radius `'24px 24px 0 0'` inline. Grip handle correct. Uses `useDialogControl`. `data-open={open}` drives CSS translate. `"use client"` present.

**Toast** — Conformant with minor observation: `onClose` and `durationMs` accepted in `ToastProps` but not destructured in function body. Per contract, Toast is a pure controlled component that does not call `onClose` or use `durationMs` internally — both intentional for caller (typically `useToast`). Accepting props the component ignores is a readability smell (see suggestions).

**ConfirmDialog** — Fully conformant. Korean defaults `'확인'`/`'취소'`. `destructive` defaults false. Both buttons `min-h-[44px]`. `bg-danger` used for destructive (Tailwind 4 auto-generates from `--color-danger`, confirmed by build). `aria-labelledby="confirm-msg"` present. Backdrop click → `onCancel`.

**useToast** — Fully conformant. `show()` clears prior timer before scheduling new. `hide()` immediate. Cleanup `useEffect` on unmount. No singleton; isolated state per call site.

---

## Invariant Correctness

**Token-only styling.** Zero hardcoded hex literals in component files. `globals.css` additions contain two hex values (`--color-danger: #C53030`) and two `rgba()` values — acceptable in a token definition file, not in components.

**Touch targets.** IconButton/FAB use inline `style={{ width, height }}` — not overridable by `className`. ConfirmDialog buttons carry `min-h-[44px]`. All compliant.

**useDialogControl effect timing.** `showModal()`/`close()` exclusively inside `useEffect([open])`, never at render. Optional chaining `ref.current?.showModal()` guards null on unmount/rapid toggle.

**BottomSheet always mounted.** No conditional rendering of `<dialog>`. Visual state via `data-open` + inline `translate` style.

**Toast null when closed.** `if (!open) return null;` — correct.

**useToast timer cleanup.** `hide()`, `show()` re-call, and `useEffect` cleanup all `clearTimeout` correctly.

---

## CLAUDE.md Compliance

| File | Lines |
|---|---|
| Card.tsx | 34 |
| EmptyState.tsx | 49 |
| IconButton.tsx | 46 |
| FAB.tsx | 35 |
| useDialogControl.ts | 45 |
| BottomSheet.tsx | 54 |
| Toast.tsx | 48 |
| ConfirmDialog.tsx | 79 |
| useToast.ts | 57 |

All source files ≤ 100 lines. All in `src/design-system/`. No barrel index. No duplicate patterns. Compliant.

---

## Type Safety

No `as any` anywhere. `useRef<HTMLDialogElement | null>(null)` typed precisely. `ReturnType<typeof setTimeout>` for timer ref — portable. `React.MouseEvent<HTMLDialogElement>` typed correctly. Clean.

---

## Test Quality

**49 new cases across 9 test files** (vs plan's ~51 estimate). All planned `it()` descriptions present.

| Test File | Cases |
|---|---|
| Card.test.tsx | 5 |
| EmptyState.test.tsx | 7 |
| IconButton.test.tsx | 6 |
| FAB.test.tsx | 5 |
| useDialogControl.test.ts | 5 |
| BottomSheet.test.tsx | 6 |
| ConfirmDialog.test.tsx | 8 |
| Toast.test.tsx | 5 |
| useToast.test.ts | 5 |

**Dialog stubs.** All 3 dialog test files install `vi.fn()` stubs for `HTMLDialogElement.prototype.showModal/close` in `beforeEach`, restore in `afterEach`. Pattern matches plan.

**Fake timers.** `useToast.test.ts` uses `vi.useFakeTimers()`/`vi.useRealTimers()` correctly. Timer reset test advances in three `act()` blocks totaling 2700ms.

**Source guards.** All 9 files have source-guard tests. Server (Card, EmptyState) assert absence; client (7) assert presence. Pattern matches `MoodIcon.test.tsx`.

`afterEach(cleanup)` present in every test file.

**Minor:** `useDialogControl.test.ts` case 4 uses `new MouseEvent('click', { bubbles: true, target: dialogEl })`. The `target` property in `MouseEventInit` is non-standard and silently ignored — `e.target` is set to `dialogEl` naturally by `dispatchEvent`. Test passes for the right reason but the inline option is misleading.

---

## Backward Compatibility

Only `src/app/globals.css` modified — purely additive (2 token lines + 1 CSS rule). No removed/renamed selectors. All 82 pre-REQ-005 tests continue to pass. REQ-001~004 source files untouched.

---

## Non-Blocking Suggestions

1. **Toast `onClose` / `durationMs` unused in body.** Either prefix with `_` (intentional-unused convention) or add a brief comment in destructuring noting the props are accepted for API symmetry with `useToast` but not consumed internally.
2. **ConfirmDialog hardcoded `id="confirm-msg"`.** Two simultaneously mounted instances would produce duplicate ids, breaking `aria-labelledby`. Implementation report defers to `useId()`. Fine for current usage; revisit when multi-dialog scenario lands.
3. **Toast `onClose` JSDoc ambiguity.** "for ref" phrasing is unclear. Suggest "Provided for API symmetry with useToast; Toast does not call this itself."
4. **`useDialogControl.test.ts` case 4 `MouseEventInit.target`.** Inert option in `MouseEventInit`. Comment explaining `target` is set by `dispatchEvent` automatically would clarify.

---

## Positive Notes

- Inline `style` for pixel dimensions (touch targets, border-radius) makes touch-target guarantee non-overridable — subtle but correct.
- `useDialogControl` cleanly extracted and shared between BottomSheet and ConfirmDialog — UI reuse rule honored.
- `BottomSheet` slide-up via `translate` + `data-open` is structurally sound; happy-dom can't verify transition but invariant upheld.
- `useToast` timer management robust: 3 separate `clearTimeout` paths all covered by tests.
- Source guards using `node:fs` enforce server/client boundary at test time without full SSR env.
- Zero new dependencies — all tooling already in place from REQ-003.

---

## Architecture Consistency

All 9 files follow REQ-003 (`MoodIcon.tsx`) patterns: React import (if needed), server-component comment, named interface before function, `style={{}}` for pixel dims, per-file vitest env directive + `afterEach(cleanup)` in tests, `node:fs` source guards. Design-system folder is cohesive.

---

## Blocking Issues

None.

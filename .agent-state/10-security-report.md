# Security Review — REQ-005

## Summary

REQ-005 adds nine design-system primitive files and eight test files. Two CSS tokens and one `dialog::backdrop` rule were added to `globals.css`. No new runtime dependencies, no network calls, no storage access, no secrets. Zero new security issues. Six carry-forward items from prior cycles remain unchanged.

## Scope

- `src/design-system/{Card, EmptyState, IconButton, FAB, BottomSheet, Toast, ConfirmDialog}.tsx`
- `src/design-system/{useDialogControl, useToast}.ts`
- `src/app/globals.css` (additive: 2 tokens + 1 rule)
- 8 `src/design-system/__tests__/*.{test.tsx, test.ts}` files

## Critical / High / Medium / Low Issues

None new. See carry-forward.

## XSS and Injection Audit

**`dangerouslySetInnerHTML` / `innerHTML` / `eval` / `new Function` / `document.write`** — grep across all 9 source files returned zero matches.

**ReactNode props.** `EmptyState.title/icon/action`, `BottomSheet.children`, `IconButton.icon`, `FAB.icon` flow through React JSX renderer — auto-escaped for strings; ReactNode values follow React reconciler rules. No `innerHTML` path.

**String props.** `Toast.message`, `ConfirmDialog.message/confirmLabel/cancelLabel` typed `string`, placed as JSX text children — rendered as text nodes.

**`className` interpolation.** All 9 components concatenate caller-supplied `className` into JSX `className` attributes. Tailwind class strings not executable; rendered as plain HTML attribute string. Not an injection vector.

**`Toast.role` union.** TypeScript narrows to `'status' | 'alert'`. No free-form ARIA role accepted.

## Click-jacking and UI Redress

**`<dialog showModal()>` top-layer.** `BottomSheet` and `ConfirmDialog` both call `ref.current?.showModal()` inside `useEffect`. `showModal()` promotes dialog to browser top layer, traps focus, blocks background pointer interaction. Security-positive: prevents UI redress on background while modal open.

**Backdrop-click detection.** `useDialogControl.onDialogClick` compares `e.target === ref.current`. Backdrop click sets `e.target` to `<dialog>` node; child clicks don't bubble up with `<dialog>` as target. No DOM mutation; only calls caller-supplied `onClose`. Safe.

**Escape key.** Native `<dialog>` fires `close` event on Escape; caller must wire `onClose` to flip `open=false`. State desync risk if not wired — accessibility/behavior concern (noted in code review), not security.

## CSRF / Mutations / Secrets

- No mutations, no form submissions, no HTTP calls.
- Grep for `password|secret|api_key|API_KEY|apiKey|bearer|Authorization` — zero matches.
- No `console.log`/`console.error` in any source file.

## Insecure Defaults

All defaults safe:
- `Toast.role = 'status'` (less intrusive default; caller opts in to `'alert'`).
- `ConfirmDialog.destructive = false` (non-destructive default).
- `ConfirmDialog.confirmLabel/cancelLabel` default Korean `'확인'`/`'취소'`.
- `Card.large = false` (smaller radius).

## Dependency Audit

No new deps. `npm audit --omit=dev`: 0 critical / 0 high / 2 moderate (same `postcss < 8.5.10` carry-forward). Delta from REQ-004: 0.

## Carry-forward (from REQ-004, still applicable)

1. **`JSON.parse` on localStorage without prototype-pollution guard** — Low/Medium. Hard gate at REQ-019.
2. **`Photo.dataUrl` stored without format/size validation** — Medium, deferred. Hard gate at REQ-011.
3. **No runtime schema validation on write paths** — Medium, deferred. Hard gate at REQ-019.
4. **`Settings` wide index type** — Low. Narrow as concrete keys land.
5. **esbuild dev-server CORS** (GHSA-67mh-4wv8-2f99) — dev-only.
6. **`postcss` CSS stringify XSS** (GHSA-qx2v-qp2m-jg93) — build-tool-only.

## Additional Observations (Non-blocking)

- **`ConfirmDialog` hardcoded `id="confirm-msg"`.** Multi-mount would produce duplicate ids, breaking `aria-labelledby`. Accessibility defect, not security. Defer to `useId()` in future REQ.
- **`EmptyState.title` ReactNode branch** rendered as-is. Caller must not pass unsanitized user HTML elements — acceptable usage pattern for an internal design-system primitive.

## Required Fixes

None.

## Accepted Residual Risks

Same six items as REQ-004 carry-forward. No new risks introduced.

## Verdict
PASS

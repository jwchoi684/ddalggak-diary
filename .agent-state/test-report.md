# Test Report — REQ-005

## Summary

All four verification gates pass. 131/131 tests pass across 19 test files. The 9 new REQ-005 source files exist at the expected paths. Server/client `"use client"` boundaries are correctly enforced. `globals.css` contains all three required additions. Korean defaults (`확인`/`취소`) are present in `ConfirmDialog`. No new runtime or dev dependencies were introduced in REQ-005. All 82 pre-REQ-005 tests (REQ-002 through REQ-004 plus limits fix) continue to pass.

---

## Commands Run

| Command | Result | Detail |
|---|---|---|
| `npm run typecheck` | PASS | Exit 0, no output |
| `npm run lint` | PASS | No ESLint warnings or errors (cosmetic `next lint` deprecation notice only) |
| `npm test` | PASS | 131/131 tests, 19 files, 3.08 s |
| `npm run build` | PASS | Next.js 15.5.18, 4/4 static pages generated |

---

## Test Case Coverage vs Plan

Plan projected ~51 cases across 9 new test files. Runner confirms 49 new cases (131 total − 82 baseline). All planned `it()` descriptions are present in the actual test files.

### Card.test.tsx — 5 cases (plan: 5)

| Plan Description | Present |
|---|---|
| renders children | yes — "renders children inside a div" |
| boxShadow token equals var(--shadow-card) | yes |
| radius tokens — default/large switch | yes |
| className merged | yes |
| source-guard: no "use client" | yes |

### EmptyState.test.tsx — 7 cases (plan: 7)

| Plan Description | Present |
|---|---|
| renders all 4 slots | yes |
| omits absent optional slots | yes |
| string title wrapped in `<p>` | yes |
| ReactNode title rendered as-is | yes |
| className merged | yes |
| description text present | yes |
| source-guard: no "use client" | yes |

### IconButton.test.tsx — 6 cases (plan: 6)

| Plan Description | Present |
|---|---|
| `<button type="button">` with aria-label | yes |
| touch-target 44×44 | yes |
| onClick fires on click | yes |
| disabled prevents onClick | yes |
| disabled adds opacity-40 / cursor-not-allowed | yes |
| source-guard: has "use client" | yes |

### FAB.test.tsx — 5 cases (plan: 5)

| Plan Description | Present |
|---|---|
| `<button type="button">` with aria-label | yes |
| touch-target 56×56 | yes |
| onClick fires | yes |
| default fixed / bottom-6 / right-6 / bg-charcoal | yes |
| source-guard: has "use client" | yes |

### useDialogControl.test.ts — 5 cases (plan: 5)

| Plan Description | Present |
|---|---|
| open=true calls showModal once | yes |
| open=false calls close once | yes |
| toggling true→false→true calls showModal twice | yes |
| onDialogClick matching target → onClose | yes |
| onDialogClick non-matching target → no onClose | yes |

### BottomSheet.test.tsx — 6 cases (plan: 6)

| Plan Description | Present |
|---|---|
| open=true invokes showModal | yes |
| open=false invokes close | yes |
| grip handle always rendered | yes |
| backdrop click fires onClose | yes |
| children rendered inside dialog | yes |
| source-guard: has "use client" | yes |

### ConfirmDialog.test.tsx — 8 cases (plan: 7–8)

| Plan Description | Present |
|---|---|
| renders message text | yes |
| default Korean labels + min-h-[44px] | yes |
| custom labels override defaults | yes |
| confirm click fires onConfirm only | yes |
| cancel click fires onCancel only | yes |
| backdrop click fires onCancel | yes |
| destructive=true applies bg-danger | yes |
| source-guard: has "use client" | yes |

### Toast.test.tsx — 5 cases (plan: 5)

| Plan Description | Present |
|---|---|
| renders when open=true | yes |
| nothing rendered when open=false | yes |
| default role="status" | yes |
| role="alert" opt-in | yes |
| source-guard: has "use client" | yes |

### useToast.test.ts — 5 cases (plan: 5)

| Plan Description | Present |
|---|---|
| initial state: open=false, message="" | yes |
| show() sets open=true and message | yes |
| auto-hides after 1800ms | yes |
| re-calling show resets timer | yes |
| hide() immediately closes | yes |

---

## Existing Tests Regression

82 tests from REQ-002 through REQ-004 (including limits fix) pass without modification:

| Suite | Tests |
|---|---|
| `src/lib/storage/__tests__/` (7 files) | 44 (41 storage + 3 limits) |
| `src/design-system/__tests__/moods.test.ts` | 12 |
| `src/design-system/__tests__/MoodIcon.test.tsx` | 9 |
| `src/design-system/__tests__/personas.test.ts` | 17 |
| **Baseline total** | **82** |

All 82 pass. No regressions detected.

---

## globals.css Token Additions Verified

All three additions confirmed present in `src/app/globals.css`:

- Line 32: `--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04);` — inside `@theme {}`
- Line 35: `--color-danger: #C53030;` — inside `@theme {}`
- Line 49: `dialog::backdrop {` block — after `html, body` block

---

## Source Guards Verified

| File | Expected | Actual |
|---|---|---|
| `Card.tsx` | no `"use client"` | confirmed absent |
| `EmptyState.tsx` | no `"use client"` | confirmed absent |
| `IconButton.tsx` | has `"use client"` | confirmed present |
| `FAB.tsx` | has `"use client"` | confirmed present |
| `useDialogControl.ts` | has `"use client"` | confirmed present |
| `BottomSheet.tsx` | has `"use client"` | confirmed present |
| `ConfirmDialog.tsx` | has `"use client"` | confirmed present |
| `Toast.tsx` | has `"use client"` | confirmed present |
| `useToast.ts` | has `"use client"` | confirmed present |

---

## Korean Defaults Verified

`src/design-system/ConfirmDialog.tsx` lines 37–38:

```
confirmLabel = '확인',
cancelLabel = '취소',
```

Both strings also appear in JSDoc at lines 13–14.

---

## package.json Stability

Runtime dependencies: `next`, `react`, `react-dom` — unchanged.

Dev dependencies: `@tailwindcss/postcss`, `@testing-library/react`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`, `happy-dom`, `tailwindcss`, `typescript`, `vitest` — all established in REQ-002/REQ-003. No new entries added by REQ-005.

---

## Discrepancies / Notes

1. **Test count arithmetic**: Plan projected ~51 cases; runner shows 49 new cases (131 − 82). The grep of `it(` across 9 new test files returns 52 matches, inflated by 3 occurrences where `it` appears in import destructures. The runner count of 49 is authoritative and within the plan's estimate.

2. **ConfirmDialog ARIA workaround**: Tests use `document.querySelectorAll('button')` rather than `screen.getByRole('button')` because `<dialog>` elements without the native `open` attribute are excluded from the a11y tree in happy-dom. This is a test-environment limitation, not a component defect.

3. **BottomSheet backdrop click mechanism**: `fireEvent.click(dialogEl, { target: dialogEl })` correctly exercises the `e.target === ref.current` check. happy-dom sets `e.target` to the dispatched element.

4. **CJS deprecation warning from Vitest**: The `The CJS build of Vite's Node API is deprecated` warning appears at test startup. It is cosmetic, does not affect results, and was already present from REQ-002.

---

## Remaining Risks

- **ConfirmDialog `aria-labelledby` id collision**: `confirm-msg` is hardcoded. Simultaneous dual mounts would collide. Deferred to a future REQ using `useId()`.
- **Toast z-index vs `showModal()` top layer**: Cannot be unit-tested. Deferred to E2E / REQ-015.
- **BottomSheet animation frames**: CSS transitions not computed by happy-dom; slide-up verified structurally only. E2E coverage deferred to REQ-007.

---

## Verdict
PASS

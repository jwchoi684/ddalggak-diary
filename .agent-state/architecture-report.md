# Architecture Report

## Summary

Repository is Option C (Next.js 15 App Router + React 19 + Tailwind 4 + TypeScript) of 딸깍일기. REQ-001 through REQ-004 are complete: scaffold, design tokens, storage layer, moods, personas, `MoodIcon`. REQ-005 adds seven design-system primitives on top. No backend; frontend-only; purely additive — seven new `.tsx` files + seven test files in `src/design-system/`.

---

## Frontend Findings

**Framework.** Next.js 15 App Router. Root layout is a Server Component wrapping `max-w-[420px]` body; primitives inherit container width — none should set its own.

**Existing design-system file.** `MoodIcon.tsx` is the canonical Server Component template: no `"use client"`, inline `style` for pixel-exact dimensions, `className` pass-through, Korean `aria-label`, silent fallback on unknown id.

**Server/client component split — confirmed.**

| Primitive | Directive | Rationale |
|---|---|---|
| `Card` | none (Server) | Pure visual wrapper; no handlers, no state. |
| `EmptyState` | none (Server) | Presentation leaf; `action` slot is `ReactNode` from caller. |
| `IconButton` | `"use client"` | Accepts `onClick`; event handler requires client. |
| `FAB` | `"use client"` | Accepts `onClick`; fixed-position interactive button. |
| `BottomSheet` | `"use client"` | Controlled `open`/`onClose`; `useEffect` to call `dialogRef.showModal()`/`close()`. |
| `Toast` | `"use client"` | Auto-dismiss timer via `useEffect` + `setTimeout`; transition state. |
| `ConfirmDialog` | `"use client"` | Controlled visibility; button handlers; same `<dialog>` approach as BottomSheet. |

**Token coverage — two gaps confirmed in `src/app/globals.css @theme`.**
1. **`--shadow-card`**: PRD §1.6.6 says `y=2 blur=8 opacity=0.04`. CSS value: `0 2px 8px rgba(0, 0, 0, 0.04)`.
2. **`--color-danger`**: for destructive `ConfirmDialog`. PRD does not specify a red hex. Recommended `#E05C5C` — pastel-coral harmonizing with `--color-mood-angry: #F4A6A6`. WCAG AA contrast against `#FFFFFF` paper must be verified at button-font size in technical-design.

**Token consumption strategy — Tailwind 4 utility classes preferred for color/radius/font; inline `style` for pixel values from props; CSS variable reference for shadow.** Tailwind 4 does not auto-generate `shadow-*` utilities from `@theme --shadow-*` like it does for `--color-*`. Use `style={{ boxShadow: 'var(--shadow-card)' }}` or arbitrary `[box-shadow:var(--shadow-card)]`. Confirm pattern in technical-design.

**`<dialog>` element — confirmed for BottomSheet + ConfirmDialog.** React 19 has improved native `<dialog>` support. Caveats:
- `useEffect` required to call `dialogRef.current?.showModal()` when `open` flips true.
- `::backdrop` styling lives in a CSS selector block in `globals.css` — cannot be applied via Tailwind utility classes.
- Backdrop-click-to-close requires a manual `click` handler on the `<dialog>` comparing `event.target === dialogRef.current`. The `<dialog>` does not close on backdrop click by default.
- All standard patterns; not blockers.

**Toast mounting strategy.** Caller places `<Toast message open onClose />` in its own JSX tree. `position: fixed` is viewport-relative, so the toast pill anchors to the screen regardless of where in the tree it sits. No portal, no `<Toaster />` in `layout.tsx`, no context provider needed for MVP single-toast case. `useToast()` wraps `useState` (message, open) + `useEffect` (auto-dismiss timer). Keeps `layout.tsx` free of client components.

**Accessibility expectations.**

| Primitive | Element | ARIA |
|---|---|---|
| `IconButton` | `<button>` | `aria-label` required (caller-supplied Korean); `type="button"`. |
| `Card` | `<div>` | None needed; purely structural. |
| `FAB` | `<button>` | `aria-label` required; `type="button"`; `position: fixed`. |
| `BottomSheet` | `<dialog>` | Native `role="dialog"` + `aria-modal="true"` from `showModal()`. |
| `Toast` | `<div>` | `role="status"` (non-urgent, default); `role="alert"` (caller opts in via prop). |
| `ConfirmDialog` | `<dialog>` | Same as BottomSheet; confirm/cancel are `<button>`. |
| `EmptyState` | `<div>` | No interactive ARIA. |

---

## Backend Findings

Not applicable. REQ-005 is entirely frontend.

---

## Data Model Findings

Not applicable. No storage keys, no schema, no `localStorage` access.

---

## Test Structure Findings

**Existing convention.** `src/design-system/__tests__/` for design-system tests. `MoodIcon.test.tsx` establishes:
- File-level `// @vitest-environment happy-dom` directive.
- Global vitest config defaults to `environment: 'node'`; per-file override.
- `@testing-library/react` `render` + `screen` + `cleanup` in `afterEach`.
- Source-guard tests via `fs.readFileSync` to assert `"use client"` presence/absence.

**Timer testing.** `Toast` auto-dismiss requires `vi.useFakeTimers()` / `vi.runAllTimers()` / `vi.useRealTimers()`. Built into Vitest 2; no new dep.

**`<dialog>` in happy-dom.** Partial support: `showModal()` and `close()` are present. `::backdrop` pseudo-element not rendered. Tests assert observable state (`open` attribute, callback invocation), not visual backdrop.

---

## Tooling and Commands

| Command | Script |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Watch | `npm run test:watch` |

Package manager: npm. Tailwind 4 via `@tailwindcss/postcss`. No Storybook, no Playwright, no separate E2E tooling. No new devDeps expected.

---

## Existing Patterns to Reuse

1. **`MoodIcon.tsx` structure** — direct template for `Card` and `EmptyState` (server primitives).
2. **Per-file `// @vitest-environment happy-dom` directive** in every `.test.tsx`.
3. **Source-guard `fs.readFileSync` pattern** — apply to `Card`/`EmptyState` to assert no `"use client"`; apply inversely to client primitives.
4. **`className` prop pass-through** on every primitive root element.
5. **No barrel** — per-file imports continue.
6. **Korean defaults for user-visible strings** — `ConfirmDialog` `확인`/`취소`.

---

## Files Likely to Change

**New source (7):**
- `src/design-system/{IconButton, Card, FAB, BottomSheet, Toast, ConfirmDialog, EmptyState}.tsx`

**New tests (7):**
- `src/design-system/__tests__/{IconButton, Card, FAB, BottomSheet, Toast, ConfirmDialog, EmptyState}.test.tsx`

**Existing file additive change (1):**
- `src/app/globals.css` — add `--shadow-card` and `--color-danger` to `@theme` block. No other token changes.

No other existing files change. `layout.tsx`, `page.tsx`, `MoodIcon.tsx`, `moods.ts`, `personas.ts`, and `src/lib/storage/` untouched.

---

## Risks

1. **`--shadow-card` consumption pattern.** Tailwind 4 does NOT auto-generate `shadow-card` utility from `@theme --shadow-*` the way it generates `bg-*` from `--color-*`. Components must use `style={{ boxShadow: 'var(--shadow-card)' }}` or `[box-shadow:var(--shadow-card)]` arbitrary class. If a developer assumes a `shadow-card` utility exists, tests pass but styles silently don't apply. Technical-design must lock the pattern.

2. **`<dialog>` backdrop dismiss gap.** Native `<dialog>` does not fire `close` on backdrop click. Manual `click` handler comparing `event.target === dialogRef.current` is needed. Test plan should include "click outside closes" case.

3. **happy-dom `<dialog>` partial support.** Tests must only assert observable state and callback invocation, not `::backdrop` visual presence.

4. **100-line file-size rule under pressure for `BottomSheet`/`ConfirmDialog`.** Non-trivial implementation surface (dialog ref, open/close effects, backdrop click, keyboard). If either exceeds 100 lines, extract a shared `useDialogControl` hook.

5. **Prop-signature lock-in.** REQ-005 prop signatures will be consumed by REQ-007+. Too narrow an API causes workaround code later. Design phase must be conservative about what it does not expose (e.g., `Toast` severity levels, `BottomSheet` title slot).

---

## Unknowns

1. **Exact `--color-danger` hex.** Recommended `#E05C5C` but WCAG AA (4.5:1 against `#FFFFFF` at button-font size) needs measurement. If failing, lighten background rather than darken beyond brand palette range.
2. **`Toast` z-index vs `<dialog>` top layer.** `showModal()` puts dialog in the top layer; a `position: fixed` div toast sits below. If user fires a toast while BottomSheet is open, toast may be hidden. Resolution: toast may need to be inside the dialog or use `<dialog>`/popover API itself. Flag for design phase.
3. **`EmptyState` title type.** `string` vs `ReactNode`. `string` forces a fixed heading level; `ReactNode` lets caller choose `<h2>` vs `<p>`. Design phase decides.

---

## Verdict
PASS

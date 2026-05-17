# Requirement Intake — REQ-005

## Restatement

REQ-005 builds the foundation of the project's UI vocabulary: seven reusable
design-system primitives that every subsequent screen REQ will compose from —
`IconButton` (white circular 44px), `Card` (white, radius 16–20, subtle shadow),
`FAB` (black 56px, fixed bottom-right), `BottomSheet` (top-rounded 24px with
grip handle), `Toast` (gray pill, 1.5–2s auto-dismiss), `ConfirmDialog` (with
destructive variant), and `EmptyState` (icon + title + optional action). All
primitives live in `src/design-system/`, consume only design tokens already
defined in `src/app/globals.css @theme` (no hardcoded colors/radii/shadow), and
guarantee a 44×44 minimum touch target so callers in REQ-007+ never have to
re-litigate accessibility or visual cohesion.

## In Scope (7 primitives)

| Primitive       | Source (PRD)       | File (target)                                | Single responsibility                                  |
|-----------------|--------------------|----------------------------------------------|--------------------------------------------------------|
| `IconButton`    | §1.6.5, §1.6.6     | `src/design-system/IconButton.tsx`           | Inline 44px white circular button hosting one 24px line icon. |
| `Card`          | §1.6.6             | `src/design-system/Card.tsx`                 | White surface, radius 16–20, shadow y=2 blur=8 op=0.04. |
| `FAB`           | §1.6.6             | `src/design-system/FAB.tsx`                  | Fixed bottom-right black circular 56px action button.   |
| `BottomSheet`   | §1.6.6, §5.3       | `src/design-system/BottomSheet.tsx`          | Modal panel: top radius 24, grip handle, backdrop dismiss. |
| `Toast`         | §1.6.6, §5.2       | `src/design-system/Toast.tsx`                | Pill notification at screen bottom, auto-dismiss 1.5–2s. |
| `ConfirmDialog` | §5.4               | `src/design-system/ConfirmDialog.tsx`        | Two-button confirm with destructive variant.            |
| `EmptyState`    | §5.5               | `src/design-system/EmptyState.tsx`           | Icon/illustration + title + description + optional action. |

Each primitive ships with its own Vitest spec under `tests/design-system/`
following REQ-003 / REQ-004 precedent (node env by default; happy-dom per file
where DOM is needed).

## Out of Scope (deferred to owner REQ)

- **`Header` composite** (PRD §5.1 — left/title/right slots assembling two/three
  `IconButton`s) → first concrete use is the calendar top bar, so own it in
  **REQ-007** (or REQ-006 if the nav shell needs it sooner). REQ-005 only
  ships the `IconButton` atom; the layout composite is not a primitive.
- **Mood-color tinted cards / mood-bar chart bars** (PRD §1.6.6 last row) →
  owned by **REQ-014** (statistics screen). The base `Card` here is achromatic.
- **Calendar day cell / mood emoji tile** → owned by **REQ-007**.
- **Photo carousel / fullscreen viewer** → owned by **REQ-011 / REQ-012**.
- **Chat message bubbles, cited-diary chips, persona avatar pill** → owned by
  **REQ-015 / REQ-017**.
- **Theming / dark mode** → PRD §8.2 P1, indexed out of MVP.
- **Animation / transition system** (slide between screens, fade-slide for
  modals — PRD §6.1) → owned by **REQ-006** (nav shell) for screen-level
  transitions; primitive-level animations (toast fade, bottom-sheet slide-up)
  stay inside each primitive and use plain CSS transitions only.
- **Storybook / demo page** — PRD §5 marks it optional and REQ-005's acceptance
  criteria say "선택". Skip to avoid a new dev dependency; Vitest specs cover
  render-time guarantees.

## Invariants

1. **Token-only styling.** Every color, radius, shadow, font, and the mobile
   container width must reference a CSS custom property defined under
   `@theme` in `src/app/globals.css`. No hex literals, no inline magic radius
   numbers inside component files. Shadow `y=2 blur=8 opacity=0.04` is
   introduced as a token in REQ-005 (`--shadow-card`) before any component
   uses it.
2. **44×44 minimum touch target.** Every interactive primitive (`IconButton`,
   `FAB`, `BottomSheet` close affordance, `ConfirmDialog` buttons, `Toast`
   when dismissible, `EmptyState.action`) must occupy at least 44×44 CSS px
   regardless of icon size. Static primitives (`Card`, `EmptyState` without
   action) are exempt.
3. **One file = one primitive.** Each primitive is its own `.tsx` file with a
   single named export and stays ≤ 100 lines (CLAUDE.md). Subcomponents that
   start to grow get split (e.g. `BottomSheet` backdrop, `ConfirmDialog`
   action row). No barrel `index.ts` — callers import per-file
   (REQ-003 / REQ-004 precedent).
4. **PRD §1.6.6 dimensions are exact.** `IconButton` container 44px / icon
   24px; `FAB` 56px; `BottomSheet` top radius 24px with grip handle;
   `Toast` lifespan in the 1500–2000ms range; `Card` radius within 16–20px.
   These numbers are non-negotiable and asserted by tests.
5. **Achromatic UI surface, peach for emphasis only.** Primitives' default
   surface colors come from `--color-paper`, `--color-cream`, `--color-meta`,
   `--color-charcoal`. `--color-peach` only appears for explicit
   active/selected emphasis when a caller opts in (none of the seven
   primitives require it by default).
6. **Korean defaults for user-visible strings.** `ConfirmDialog` default
   button labels are `확인` / `취소` (overridable via props). `Toast` carries
   no internal strings (caller supplies the message). `EmptyState` carries
   no defaults — caller supplies `title` and optional `description` (Korean,
   per CLAUDE.md "Working language").
7. **Swappable visual layer.** Like `MoodIcon`, every primitive accepts an
   optional `className` so callers can adjust layout (margin, flex
   placement) without forking — and so the asset/skin can be swapped later
   without changing call sites.
8. **No new runtime dependencies.** Strictly styled wrappers around native
   HTML elements. No Radix, no Headless UI, no `react-aria`, no animation
   library. (Test deps already installed; no additions.)

## Open Questions and Recommended Defaults

1. **Server vs Client component split.**
   *Recommended default:* split as follows so server-rendering is preserved
   wherever possible. **Server components** (no `"use client"`): `Card`,
   `EmptyState` — both are purely visual leaves with no event handlers or
   state. **Client components**: `IconButton`, `FAB` (both accept `onClick`),
   `BottomSheet` (controlled `open` + `onClose`, focus management,
   keyboard ESC), `Toast` (timer + transition state), `ConfirmDialog`
   (controlled visibility + button handlers). This matches the `MoodIcon`
   precedent of "default to server, opt into client only when needed".

2. **Headless library vs strictly styled wrappers.**
   *Recommended default:* strictly styled wrappers around native HTML
   elements. No Radix / Headless UI / react-aria. Rationale: MVP scope, no
   new runtime dependencies, file-size rule favors small primitives, and the
   PRD's interaction surface (open/close + auto-dismiss) is small enough to
   hand-roll. If accessibility regressions show up in REQ-008 / REQ-009,
   revisit then — not now.

3. **`BottomSheet` semantics — native `<dialog>` or portal'd `<div>`.**
   *Recommended default:* use the native `<dialog>` element with
   `showModal()` / `close()`. Pros: native modal semantics (focus trap,
   `Escape` close, backdrop), zero portal plumbing, works under React 19 +
   Next.js 15 App Router. Cons: requires a tiny client-side `useEffect` to
   call `showModal()` when `open` prop flips; styling the `::backdrop`
   pseudo-element is acceptable and uses tokens. Same approach reused by
   `ConfirmDialog` so we only solve modal semantics once.

4. **`Toast` API shape — controlled component or imperative hook.**
   *Recommended default:* ship a small **controlled component**
   (`<Toast message open onClose />`) plus a **`useToast()` hook** that
   wraps `useState` + auto-dismiss timer. No global singleton, no
   provider context. Rationale: matches REQ-004 / REQ-002 functional style,
   trivially testable, no React tree contortions. A `ToastContainer` +
   `addToast()` queue can be added in a later REQ if multiple simultaneous
   toasts ever become a requirement (PRD shows only single toasts today).

5. **`ConfirmDialog` destructive variant.**
   *Recommended default:* add a `destructive?: boolean` prop (default
   `false`). When `true`, the confirm button uses a red token introduced
   here (`--color-danger`, e.g. `#E25C5C` — pastel-saturation red picked to
   harmonize with mood palette; final hex confirmed in technical-design
   phase against accessibility contrast). This satisfies PRD §5.4 "위험한
   액션은 [확인]을 빨간색" without inventing a one-off color at the call
   site.

6. **`IconButton` and `FAB` — share a base or stay separate.**
   *Recommended default:* keep them as **two separate files**. They share
   the "circular icon-only button" idea but diverge on every concrete
   axis: size (44 vs 56), surface (white vs black), positioning (inline vs
   `fixed` bottom-right), and shadow (subtle card-shadow vs none/distinct).
   A shared parent would force a `variant` prop that hides more than it
   reveals. Keep both ≤ 100 lines and let the duplication remain — it's a
   handful of style declarations.

7. **`EmptyState` content slots.**
   *Recommended default:* props =
   `{ icon?: ReactNode; title: string; description?: string; action?: ReactNode }`.
   `icon` is `ReactNode` (not `string`) so callers can pass an emoji span,
   a `MoodIcon`, an SVG, or a future watercolor `<img>` without API
   change. `action` is `ReactNode` so callers compose a `FAB`-styled
   button or text link as needed — `EmptyState` itself stays
   presentation-only.

8. **`className` pass-through on every primitive.**
   *Recommended default:* **yes**, every primitive exposes an optional
   `className` merged onto its root element. Mirrors the `MoodIcon`
   precedent and gives callers an escape hatch for layout-only adjustments
   (margin, grid placement) without touching interior styles. Internal
   styles still win on color / radius / shadow because they are listed last
   in the className concatenation or applied via `style` for non-overridable
   invariants (size, shadow).

9. **`Toast` exact lifespan.**
   *Recommended default:* prop `durationMs?: number` with default `1800`
   (the midpoint of the PRD-mandated 1500–2000ms band). Tests assert the
   prop is respected and the default falls inside the band.

10. **Demo / Storybook page.**
    *Recommended default:* **skip** for REQ-005. PRD §5 marks it optional;
    REQ-005's acceptance criterion says "선택"; adding Storybook brings a
    non-trivial dev dependency. Vitest render specs already prove each
    primitive mounts and behaves. A throwaway demo route can be added by
    REQ-006 if useful for nav-shell validation.

## Dependency Check

- **REQ-001 (DONE)** — Provides Next.js 15 + React 19 + Tailwind 4 +
  TypeScript scaffold and `src/app/globals.css @theme` token block that
  every primitive will consume. Confirmed present:
  `--color-cream / charcoal / meta / paper / peach / peach-dark / peach-light / success`,
  `--color-mood-*`, `--container-mobile: 420px`, `--radius-card: 16px`,
  `--radius-card-lg: 20px`, `--font-sans`. Two tokens still to be added
  in REQ-005 implementation: `--shadow-card` (y=2 blur=8 op=0.04) and
  `--color-danger` (destructive confirm).
- REQ-005 has no other declared dependencies in `requirements/index.md`.
  REQ-002 / REQ-003 / REQ-004 are DONE, so the `MoodIcon` / storage types /
  personas modules are available if any primitive demo or test wants them
  (none required).

## Verdict
PASS
